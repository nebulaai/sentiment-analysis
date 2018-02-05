initiateContract(function () {
    loadContract(function () {
    });
    prepareTaskContract();
});

const scriptAddressDefault = "http://quantum.nebula-ai.network/script/train.py"
const dataAddressDefault = "http://quantum.nebula-ai.network/data/rt-polarity.zip";
const outputAddress = "http://ec2-18-220-218-90.us-east-2.compute.amazonaws.com/miner_model/";
const minimalFee = 5;

/**
 * Temporary solution, this must move to backend
 * @return {*|XML|string|void}
 */
const uuidv4 = function () {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    ).replace(/-/g, "");
};

/**
 * Order detail parameter
 * @type {Order}
 */
let currentOrder;
const blocks = {
    submit: {},
    task: {
        task_id: 0,
        uuid: "",
        worker: "",
        has_issue: false,
        started: false,
        completed: false
    },
    dispatch: {},
    start: {},
    complete: {}
};

const useDefault = function () {
    $("#scriptUri").val(scriptAddressDefault);
};

const toggleUploadPanel = function () {
    alert("The function isn't ready yet.\n Coming soon!!!");
};


function Order(uuid, name, datasetUri, script, output, param) {
    this.uuid = uuid;
    this.name = name;
    this.datasetURI = datasetUri;
    this.scriptURI = script;
    this.outputURI = output;
    this.parameters = param;
    this.fee = 10 * 10 ^ 18;
    this.progress = 0;
    this.status = 0;
    this.transactionHash = "";
    this.taskContractAddress = "";
}

Order.prototype.setTransactionHash = function (hash) {
    this.transactionHash = hash;
};
Order.prototype.setTaskContractAddress = function (address) {
    this.taskContractAddress = address;
};


const submitOrder = function (callback) {
    let uuid = uuidv4();
    let taskName = $("#taskName").val();
    let params = {"epoch": $("#epoch").val()};
    let data_uri = dataAddressDefault;
    let scriptAddress = $("#scriptUri").val();

    currentOrder = new Order(
        uuid,
        taskName,
        data_uri,
        scriptAddress,
        outputAddress + uuid,
        params
    );

    callback();
};

$(document).ready(function () {
    // changes ex, input placeholder to default value
    ////////end changes
    $('.data-form').on('submit', function (e) {
        e.preventDefault();
        submitOrder(function () {
            $("#payment").css("visibility","visible");
            $("#create_task_btn").css("visibility","hidden");
        });
    });
});

const waitingForSubmitConfirmation = function (result) {
    $('#report-loading').show();

    currentOrder.setTransactionHash(result);

    web3.eth.getTransaction(result, function (error, result) {
        if (error) {
            console.log(error);
        } else {
            blocks.submit = result;
            $("#sub_txhash").html(createLinkToExplorer(result.hash, "tx"));
            $("#sub_block_number").html("Not yet mined");
            $("#sub_block_hash").html("0x0");
            $("#sub_from").html(createLinkToExplorer(result.from, "address"));
            $("#sub_to").html(createLinkToExplorer(result.to, "address"));
            $("#sub_gas_spent").html(result.gas);
            $("#sub_gas_price").html((new BigNumber(toEther(result.gasPrice))).toString());
            $("#sub_fee").html((new BigNumber(toEther(result.value))).toString());
        }
    });


    console.log("Transaction Hash: ", result);
    console.log("waiting for submit confirmation");

    checkForSubmission(result);
};
const waitingForTaskDispatch = function () {

    console.log("waiting for task @ ", currentOrder.taskContractAddress, " to be dispatched");

    taskContractInstance.worker(function (error, result) {
        if (error) {
            console.log(error);
        } else {

            if (web3.toDecimal(result) !== 0) {
                console.log("Worker address : " + result);
                $("#taskDispatched").css("visibility","visible");
                waitingForTaskStart();
            }
            else {
                setTimeout(function () {
                        waitingForTaskDispatch();
                    }, 2500
                )
            }
        }
    });
};
const waitingForTaskStart = function () {
    //wait for start
    console.log("Waiting for task @ ", currentOrder.taskContractAddress, " to start");

    taskContractInstance.started(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            if (result) {
                console.log("Task has been started");
                $('#taskStarted').css("visibility","visible");
                waitingForTaskCompletion();
            } else {
                setTimeout(function () {
                    waitingForTaskStart();
                }, 2500);
            }
        }
    });
};

const showResult = function (fee, hash) {
    console.log("Completion fee : " + fee + hash);
    localStorage.setItem("completed", true);
    localStorage.setItem("uuid", currentOrder.uuid);
    localStorage.setItem("task_address", currentOrder.taskContractAddress);

    console.log(localStorage.completed);
    console.log(localStorage.uuid);
    console.log(localStorage.task_address);
    window.open("history"); //, "_self"
};

const waitingForTaskCompletion = function () {

    //wait for completion
    console.log("Waiting for task @ ", currentOrder.taskContractAddress, " to complete");

    taskContractInstance.completed(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            if (result) {
                showResult();
                $('#taskCompleted').css("visibility","visible");
                $('#report-loading').hide();
                $('#view-report-btn').show();
            } else {
                setTimeout(function () {
                    waitingForTaskCompletion();
                }, 2500);
            }

        }
    });
};

const payToken = function () {
    let fee = parseFloat($("#tx_fee_value").val());
    console.log(JSON.stringify(currentOrder.parameters));

    if (fee >= minimalFee) {

        currentOrder.fee = web3.toWei(fee, "ether");
        try {
            nebulaAi.submitTask(
                currentOrder.uuid,
                currentOrder.name,
                currentOrder.datasetURI,
                currentOrder.scriptURI,
                currentOrder.outputURI,
                JSON.stringify(currentOrder.parameters),
                {
                    value: currentOrder.fee
                },
                function (error, result) {
                    if (error) {
                        console.log(error);
                    } else {
                        waitingForSubmitConfirmation(result);
                    }
                });
        } catch (error) {
            console.log(error);
        }
    } else alert("Minimum fee is less than 10 token, if you need more use the link below to get some token to try");
};

function isTaskStarted() {
    taskContractInstance.started(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            blocks.task.started = result;
        }
    });
}

function isTaskOk() {
    taskContractInstance.task_issue(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            blocks.task.has_issue = result;
        }
    });
}

function isTaskCompleted() {
    taskContractInstance.completed(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            blocks.task.completed = result;
        }
    });
}

function myTaskWorker() {
    taskContractInstance.worker(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            blocks.task.worker = result;
            $("#task_worker_cell").empty().html(createLinkToExplorer(result, "address"));
        }
    });
}

function getTaskID() {
    taskContractInstance.task_id(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            blocks.task.task_id = Number(result);
            $("#task_id_cell").empty().html(blocks.task.task_id);
        }
    })
}

function getUuid() {
    taskContractInstance.uuid(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            blocks.task.uuid = result;
            $("#uuid_cell").empty().html(web3.fromAscii(result));
        }
    })
}

function getTransaction(panel, block, hash) {
    web3.eth.getTransaction(hash, function (error, result) {
        if (error) {
            console.log(error);
        } else {
            block = result;
            $(panel).show().empty().append(
                "<h5>Transaction Details</h5>" +
                "<table>" +
                "<tr><td>Tx Hash : </td><td>" + createLinkToExplorer(result.hash, "tx") + "</td></tr>" +
                "<tr><td>Block Number : </td><td>" + result.blockNumber + "</td></tr>" +
                "<tr><td>Block Hash : </td><td>" + createLinkToExplorer(result.blockHash, "block") + "</td></tr>" +
                "<tr><td>From Wallet : </td><td>" + createLinkToExplorer(result.from, "address") + "</td></tr>" +
                "<tr><td>To Nebula Contract @: </td><td>" + createLinkToExplorer(result.to, "address") + "</td></tr>" +
                "<tr><td>Gas Spent : </td><td>" + result.gas + "</td></tr>" +
                "<tr><td>Gas Price : </td><td>" + toEther(result.gasPrice) + "</td></tr>" +
                "<tr><td>Fee : </td><td>" + toEther(result.value) + "</td></tr>" +
                "</table>"
            );
        }
    });
}

function createLinkToExplorer(fill, type) {
    return "<a href='http://18.218.112.136:8000/#/" + type + "/" + fill + "' target='_blank'>" + fill + "</a>"
}

function toEther(value) {
    return web3.fromWei(value, 'ether');
}

let checkForSubmission = function (hash) {
    web3.eth.getTransaction(hash, function (error, result) {
        if (error) {
            console.log(error);
        } else {
            if (result.blockNumber === null) {
                setTimeout(function () {
                    checkForSubmission(hash);
                }, 2500);
            } else {
                console.log("Transaction has been mined");
                $("#sub_block_number").html(createLinkToExplorer(result.blockNumber, "block"));
                $("#sub_block_hash").html(createLinkToExplorer(result.blockHash, "block"));

                //Task mined, go get task address
                getCurrentTask();
            }
        }
    });
}

function getCurrentTask() {
    nebulaAi.getMyActiveTasks(function (error, result) {
        if (error) {
            console.log(error);
        } else {
            if (result.length == 0) {
                setTimeout(function () {
                    getCurrentTask();
                }, 2500);
            } else {
                console.log("Current Task address" + result[0]);
                currentOrder.taskContractAddress = result[0];

                //Load Task at address
                loadTaskContract(currentOrder.taskContractAddress);

                loadTaskContractDetails();

                //Task address found
                //check for dispatch
                //TODO constant checking will cause too much read if there is a long queue
                //TODO to change in next update
                waitingForTaskDispatch();
            }
        }
    });
}

function loadTaskContractDetails() {
    $("#task_add_cell").html(currentOrder.taskContractAddress);
    $("#task_id_cell").html(getTaskID());
    $("#uuid_cell").html(getUuid());
    $("#task_worker_cell").html(myTaskWorker());
    $("#task_ok_cell").html(isTaskOk() ? "OK" : "Issue found");
}