
function TaskInfo(contract){
    this.index = 0;
    this.contract = contract;
    this.error = false;
    this.address ="";
    this.task_id = 0;
    this.uuid = "";
    this.started = false;
    this.has_issue = false;
    this.completed = false;
    this.name = "";
    this.data_address ="";
    this.script_address = "";
    this.output_address = "";
    this.parameters = {};
}

let my_task_list = [];
let complete_task_history_address = [];



/**
 * Leave empty to load the first 15 items
 * todo find a way to save txHash and price
 * @param from
 * @param to
 */
/*const get_task_history =*/
( function () {
    initiateContract(function () {                                                              
        loadContract(
            function () {
                nebulaAi.showTasks(function (error, result) {                   console.log(result);       
                    if (error) {
                        console.log(error);
                    } else {

                        complete_task_history_address = result;

                        let length = result.length;

                        // if(from === undefined) {
                        //     if (to === undefined) to = 15;
                        //     show_num = length - 1 >= to ? to : length - 1;
                        // }

                        //only show 15 if more than 15
                        //the rest will be loaded if needed
                        let index = 0;
                        let end = length > 15 ? length - 15 : 0;
                        for (let i = length - 1; i >= end; i--) {

                            let taskInfo = new TaskInfo(window.taskContract.at(result[i]));
                            taskInfo.index = index;
                            my_task_list.push(taskInfo);

                            taskInfo.contract.task_id(function (error, result) {
                                if (error) console.log(error);
                                else {
                                    my_task_list[taskInfo.index].task_id = Number(result);
                                }
                            });
                            taskInfo.contract.uuid(function (error, result) {
                                if (error) console.log(error);
                                else my_task_list[taskInfo.index].uuid = web3.toAscii(result);
                            });
                            taskInfo.contract.started(function (error, result) {
                                if (error) console.log(error);
                                else my_task_list[taskInfo.index].started = result;
                            });
                            taskInfo.contract.task_issue(function (error, result) {
                                if (error) console.log(error);
                                else my_task_list[taskInfo.index].has_issue = result;
                            });
                            taskInfo.contract.completed(function (error, result) {
                                if (error) console.log(error);
                                else my_task_list[taskInfo.index].completed = result;
                            });
                            taskInfo.contract.worker(function (error, result) {
                                if (error) console.log(error);
                                else my_task_list[taskInfo.index].worker = result;
                            });
                            taskInfo.contract.task_name(function (error, result) {
                                if(error) console.log(error);
                                else my_task_list[taskInfo.index].name = web3.toAscii(result);
                            });
                            taskInfo.contract.data_address(function (error, result) {
                                if(error) console.log(error);
                                else my_task_list[taskInfo.index].data_address = result;
                            });
                            taskInfo.contract.script_address(function (error, result) {
                                if(error) console.log(error);
                                else my_task_list[taskInfo.index].script_address = result;
                            });
                            taskInfo.contract.output_address(function (error, result){
                                if(error) console.log(error);
                                else my_task_list[taskInfo.index].output_address = result;
                            });
                            taskInfo.contract.parameters(function (error, result) {
                                if(error) console.log(error);
                                else my_task_list[taskInfo.index].parameters = result;

                            });
                            my_task_list[taskInfo.index].address = result[i];

                            index++;
                        }
                        //loadHistoryList();  
                    }
                });
            }
        );
        prepareTaskContract();
        setTimeout(function(){
            loadHistoryList();
        },1000);
    });
})();

const loadTask = function (index) {
    let t = my_task_list[index];

    $("#task_id").html(t.task_id);
    $("#task_addr").html("<a href='http://18.218.112.136:8000/#/address/"+t.address+"' target='_blank'>"+t.address+"</a>");
    $("#uuid").html(t.uuid);
    $("#task_name").html(t.name);
    $("#data_addr").html("<a href="+t.data_address+">"+t.data_address+"</a>");
    $("#scpt_addr").html("<a href="+t.script_address+">"+t.script_address+"</a>");
    $("#outp_addr").html(t.output_address);
    $("#started").html(t.started);
    $("#completed").html(t.completed);
    $("#error").html(t.has_issue);
    $("#params").html(t.parameters);
    $("#btnChart").attr("href", "output.html");

};

const loadHistoryList = function (){
    console.log(my_task_list);
    
    $.each(my_task_list, function(index, value){   
        $('#history-loading').hide();                    
        $("ul.histList").append("<li><a href='javascript:loadTask(" + index + ")'>" + value.task_id + " - " + value.name + "</a></li>");
    });

    loadTask(0);
};


$(document).ready(function () {
    if($("#inputText").val().length==0){
        $("#btnChart").attr("disabled", "disabled")
    }
    $("#inputText").on('input',function () {
        let address = $('#inputText').val();
        if (address.length == 0) {
            $('#inputText').next('div').remove();
            $('#inputText').after('<div style="color: red">Input is Required</div>');
            $("#btnChart").attr("disabled", "disabled")
        } else {
            $('#inputText').next('div').remove();
            $("#btnChart").removeAttr("disabled")
        }
    });

    const showTaskResult = function () {

        let uuid = $("#uuid").html();
        let testString = $("#inputText").val();
        if (uuid.length==0){
            alert("Please select a task")
            return;
        }
        data = JSON.stringify({"uuid": uuid, "test_string": testString});
            $.ajax({
                url: "http://ec2-18-220-218-90.us-east-2.compute.amazonaws.com/evaluation",
                method: "POST",
                data: {data: data},
                success: function (res) {
                    $(".prediction").hide();
                    switch (res) {
                        case "neutral":
                            $("#neu").show();
                            break;
                        case "neg":
                            $("#neg").show();
                            break;
                        case "pos":
                            $("#pos").show();
                    }
                }
            })
    };

    $("#btnChart").click(function () {
        showTaskResult();
    })

})
//get_task_history();

