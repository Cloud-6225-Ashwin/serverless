const aws = require("aws-sdk");
const ses = new aws.SES();
const dynamodb = new aws.DynamoDB.DocumentClient();
aws.config.update({ region: "us-east-1" });

exports.handler = (event, context, callback) => {
    let message = event.Records[0].Sns.Message
    message = JSON.parse(message)
    let searchParams = {
        TableName: "csye6225",
        Key: {
        id:message.email,
        }
    };
    dynamodb.get(searchParams, (err, resp) => {
        if(!err){
            let alive = false;
            if (resp.Item == null || resp.Item == undefined) {
                alive = false;
            } else {
                if (resp.Item.ttl > new Date().getTime()) {
                    alive = true;
                }
            }
            if(!alive){
                let currentTime = new Date().getTime();
                let ttl = process.env.timeToLive * 60 * 1000;
                let expiry = currentTime + ttl;
                let params = {
                    Item: {
                        id:message.email,
                        // token: context.awsRequestId,
                        token: message.token,
                        ttl: expiry,
                        from: "noreply@prod.ashwinkumarrk.me",
                    },
                    TableName: "csye6225"
                };

            dynamodb.put(params, (err, data) => {
                if(!err){
                    let params = {
                        Destination: {
                            ToAddresses: [message.email],
                        },
                        Message: {
                            Body: {
                                Text: { Data: "Click the link to verify email for account creation\n\n" + 
                                "http://prod.ashwinkumarrk.me/v1/app/verifyUserEmail?email="+ message.email +"&token=" + message.token},
                            },
                            Subject: { Data: "Verify Email for Account Creation" },
                        },
                        Source: "noreply@prod.ashwinkumarrk.me",
                    };
                    return ses.sendEmail(params).promise()
                } else {
                    console.log("Error");
                }
            })
            }
        } else {
            console.log("GET Request Failed");
        }
    })
}
