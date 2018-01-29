data_file = {'pos_path': 'data/rt-polaritydata/rt-polarity.pos',
             'neg_path': 'data/rt-polaritydata/rt-polarity.neg'}

with open("eval.py") as f:
    code = compile(f.read(), "eval.py", 'exec')
    exec(code, {'test_str': "it's goog, it'bad, wow", 'data': data_file,
                'uuid': 'ud'})
