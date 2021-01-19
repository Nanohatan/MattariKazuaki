$(function(){
    $("#confirm").submit(function(e){
        e.preventDefault();
        var Listname = $("#list_name").val();
        var List = $("#list_words").val().split("\n");

        console.log("Listname:" + Listname);
        console.log("Listwords:" + List);

        const client = require("../../db_client").pg_client();
        
        client.connect();
        console.log("Connected successfuly");
        client.query("CREATE Table 'Listname' (timestamp timestamp, word text);");
        for(var item of List){
            client.query("INSERT INTO 'Listname' (timestamp ,word) VALUES (now() ,'item');");
        }
    });
})