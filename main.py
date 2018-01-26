#!flask/bin/python
import json
import zipfile
from urllib.request import urlopen
from zipfile import ZipFile
import shutil
from flask import Flask, jsonify, render_template, flash, make_response, session, send_from_directory
import os
from flask import Flask, request, redirect, url_for
from io import BytesIO
from werkzeug.utils import secure_filename
from pathlib import Path


UPLOAD_FOLDER = 'app/uploads/'
DOWNLOAD_FOLDER = 'app/downloads/'
ALLOWED_EXTENSIONS = set(['zip'])


app = Flask(__name__)
# app = Flask(__name__, static_url_path='')
app.secret_key = "super secret key"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DOWNLOAD_FOLDER'] = DOWNLOAD_FOLDER

index_path = '/home/nebula/Desktop/sentiment-analysis/index.html'


def url_get_filename(url_address):
    file_name = os.path.basename(url_address)
    return file_name


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def pos_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in set(['pos'])


@app.route('/')
def index():
    return app.send_static_file('index.html')


# user upload a zip file
@app.route('/upload_local', methods=['GET', 'POST'])
def upload_local_file():
    if request.method == 'POST':
        # check if the post request has the file part
        if 'file' not in request.files:
            flash('No file part')
            return redirect(request.url)
        file = request.files['file']
        # if user does not select file, browser also
        # submit a empty part without filename
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if not allowed_file(file.filename):
            # flash('Please upload zip file only', 'error')
            return redirect(url_for('upload_error'))
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            if not os.path.exists(app.config['UPLOAD_FOLDER']):
                os.makedirs(app.config['UPLOAD_FOLDER'])
            upload_file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(upload_file_path)
            with ZipFile(upload_file_path) as local_zip:
                local_zip.extractall('data/')
            # return redirect(url_for('uploaded_file', filename=filename))
            return redirect(url_for('upload_success'))
    return redirect('/')


@app.route('/upload_remote', methods=['GET', 'POST'])
def upload_remote_file():
    if request.method == 'POST':
        url_address = request.form["url_text"]
        if not allowed_file(url_address):
            # flash('Please upload zip file only', 'error')
            return redirect(url_for('upload_error'))
        if url_address and allowed_file(url_address):
            with urlopen(url_address) as zipresp:
                with ZipFile(BytesIO(zipresp.read())) as remote_zip:
                    remote_zip.extractall('data')
            # return redirect(url_for('uploaded_file', filename=filename))
            return redirect(url_for('upload_success'))
    return redirect('/')


@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(app.config['DOWNLOAD_FOLDER'], filename)


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'error': 'Not found'}), 404)


@app.route('/tested_model',  methods=['GET'])
def tested_model():
    # import train
    # filename = 'prediction.csv'
    # return redirect(url_for('download_file', filename=filename))
    return send_from_directory('', 'packages.txt')


@app.route("/miner_model/<string:uuid>", methods=['GET', 'POST'])
def get_miner_model(uuid):
    if request.method == 'POST':
        file = request.files['files']
        uuid_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], request.form['uuid'])
        if not os.path.exists(uuid_upload_dir):
            os.makedirs(uuid_upload_dir)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(uuid_upload_dir, filename))
            return jsonify("server has received model from the miner")
    return jsonify("Failed to upload model")


@app.route("/evaluation", methods=['GET', 'POST'])
def evaluate_test():
    if request.method == 'POST':
        input_string = request.form['data']
        # format key value pairs with double quotes
        # {"uuid": "2b33413eccab4436aa38bb54f44c4509", "test_string": "it's good, it's bad"}
        input_json = json.loads(input_string)

        uuid = input_json["uuid"]
        test_string = input_json["test_string"]
        data_file_zip = os.path.join("app/uploads", uuid, "Model.zip")
        # unzip data to get pos and neg path
        zip_ref = zipfile.ZipFile(data_file_zip, 'r')
        extracted = zip_ref.namelist()
        uuid_path = os.path.split(data_file_zip)[0]

        zip_ref.extractall(uuid_path)
        zip_ref.close()
        extracted_file_pos = ""
        extracted_file_neg = ""

        for each_filename in extracted:
            if pos_file(each_filename):
                extracted_file_pos = each_filename
            if not pos_file(each_filename):
                extracted_file_neg = each_filename

        data_file = {'pos_path': uuid_path + extracted_file_pos,
                     'neg_path': uuid_path + extracted_file_neg}

        print(data_file)
        print(uuid)

        with open("eval.py") as f:
            code = compile(f.read(), "eval.py", 'exec')
            exec(code, {"test_str": test_string, 'data': data_file,
                        'uuid': uuid})

        prediction_path = os.path.join('uploads', uuid)
        # redirect(send_from_directory(prediction_path, 'prediction.csv'))
        if Path(prediction_path + "/prediction.csv").is_file():
            return send_from_directory(prediction_path, 'prediction.csv')
        elif Path(prediction_path + "/prediction.json").is_file():
            return send_from_directory(prediction_path, 'prediction.json')
        # shutil.rmtree(uuid_path)
        # return redirect(url_for('index'))
    return jsonify("Prediction failed")


@app.route('/history')
def render_history():
    return render_template('history.html')


@app.route('/output')
def render_output():
    return render_template('/output')



if __name__ == '__main__':
    app.debug = True
    app.run(host='0.0.0.0', port=80)
#     app.run()