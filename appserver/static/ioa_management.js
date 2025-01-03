require([
    "splunkjs/mvc",
    "splunkjs/mvc/utils",
    "splunkjs/mvc/simplexml/ready!",
    "jquery"
], function (mvc, utils, ready, $) {

    var tokens = mvc.Components.get("default");

    // Add IOA Button Logic
    $("#add_button").click(function () {
        var reference = tokens.get("reference_tok");
        var signature_id = tokens.get("signature_id_tok");
        if (reference && signature_id) {
            var service = mvc.createService();
            service.request(
                "storage/collections/data/ioa_filter",
                "POST",
                null,
                null,
                JSON.stringify({
                    "_time": Date.now() / 1000,
                    "reference": reference,
                    "signature_id": signature_id
                }),
                { "Content-Type": "application/json" },
                function (err, response) {
                    if (err) {
                        console.error("Error adding IOA:", err);
                        alert("Error adding IOA. Check console for details.");
                    } else {
                        console.log("IOA added successfully:", response);
                        // Audit log entry for addition
                        var auditService = mvc.createService();
                        auditService.request(
                            "search/jobs/export",
                            "POST",
                            {
                                search: "| makeresults | eval _time=now(), user=\"" + utils.getCurrentUser().username + "\", action=\"add\", reference=\"" + reference + "\", signature_id=\"" + signature_id + "\" | outputlookup append=t ioa_audit_log",
                                output_mode: "csv",
                                time_format: "%Y-%m-%dT%H:%M:%S.%Q%z"
                            },
                            null,
                            null,
                            {},
                            function (err, response) {
                                if (err) {
                                    console.error("Error updating audit log:", err);
                                } else {
                                    console.log("Audit log updated successfully:", response);
                                }
                            }
                        );
                        alert("IOA added successfully!");
                        // Refresh the current IOA values table
                        mvc.Components.get("current_ioa_table").startSearch();
                    }
                }
            );
        } else {
            alert("Please fill in both Reference and Signature ID.");
        }
    });

    // Remove IOA Button Logic
    $("#remove_button").click(function () {
        var referenceToRemove = tokens.get("remove_reference_tok");
        if (referenceToRemove) {
            var confirmRemove = confirm("Are you sure you want to remove IOA with reference: " + referenceToRemove + "?");
            if (confirmRemove) {
                // Get the current signature_id before deleting
                var getSignatureService = mvc.createService();
                getSignatureService.request(
                    "storage/collections/data/ioa_filter?query=" + JSON.stringify({ "reference": referenceToRemove }),
                    "GET",
                    null,
                    null,
                    null,
                    { "Content-Type": "application/json" },
                    function (err, response) {
                        if (err) {
                            console.error("Error fetching IOA details:", err);
                            alert("Error fetching IOA details. Check console for details.");
                        } else {
                            var current_signature_id = "";
                            var responseJson = JSON.parse(response["data"]);
                            if (responseJson.length > 0) {
                                current_signature_id = responseJson[0]["signature_id"];
                            }

                            // Delete the IOA
                            var service = mvc.createService();
                            service.request(
                                "storage/collections/data/ioa_filter/reference/" + encodeURIComponent(referenceToRemove),
                                "DELETE",
                                null,
                                null,
                                null,
                                { "Content-Type": "application/json" },
                                function (err, response) {
                                    if (err) {
                                        console.error("Error removing IOA:", err);
                                        alert("Error removing IOA. Check console for details.");
                                    } else {
                                        console.log("IOA removed successfully:", response);
                                        // Audit log entry for removal
                                        var auditService = mvc.createService();
                                        auditService.request(
                                            "search/jobs/export",
                                            "POST",
                                            {
                                                search: "| makeresults | eval _time=now(), user=\"" + utils.getCurrentUser().username + "\", action=\"remove\", reference=\"" + referenceToRemove + "\", signature_id=\"\", old_reference=\"" + referenceToRemove + "\", old_signature_id=\"" + current_signature_id + "\" | outputlookup append=t ioa_audit_log",
                                                output_mode: "csv",
                                                time_format: "%Y-%m-%dT%H:%M:%S.%Q%z"
                                            },
                                            null,
                                            null,
                                            {},
                                            function (err, response) {
                                                if (err) {
                                                    console.error("Error updating audit log:", err);
                                                } else {
                                                    console.log("Audit log updated successfully:", response);
                                                }
                                            }
                                        );
                                        alert("IOA removed successfully!");
                                        // Refresh the current IOA values table and the remove dropdown
                                        mvc.Components.get("current_ioa_table").startSearch();
                                        mvc.Components.get("remove_ioa_dropdown").startSearch();
                                    }
                                }
                            );
                        }
                    }
                );
            }
        } else {
            alert("Please select a Reference to remove.");
        }
    });
});