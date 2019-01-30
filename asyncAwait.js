async function _init() {
    try {
        const channelRecords = await _getChannelRecords()
        let sqsBatchMessage = []
        for (let i = 0; i < channelRecords.length; i++) {
            sqsBatchMessage.push({ Id: 'number_' + i, MessageBody: JSON.stringify(channelRecords[i]) })
            if ((i + 1) % 10 === 0) {
                try {
                    const statusBulkSqs = await _sendSQSMessage(sqsBatchMessage)
                    log.info(statusBulkSqs.Successful.length + ` SQS Items successfully inserted`)
                    sqsBatchMessage = []
                } catch (error) {
                    log.error(`something went's wrong in sending Items in queue: ` + error)
                    rollbar.error(error)
                }
            }
            if (i === channelRecords.length - 1 && sqsBatchMessage.length > 0) {
                try {
                    const statusBulkSqs = await _sendSQSMessage(sqsBatchMessage)
                    log.info(statusBulkSqs.Successful.length + ` SQS Items successfully inserted`)
                } catch (error) {
                    log.error(`something went's wrong in sending Items in queue: ` + error)
                    rollbar.error(error)
                }
            }
        }
    } catch (error) {
        log.error(`something went's wrong in getting channels: ` + error)
        rollbar.error(error)
    }
}

async function _getChannelRecords() {
    const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: config.cloudRegion })
    const params = {
        TableName: config.tableName
    }
    try {
        const raws = await dynamoDb.scan(params).promise()
        return raws.Items
    } catch (error) {
        log.error(`something went's wrong in scan channels records: ` + error)
        return rollbar.error(error)
    }
}

async function _sendSQSMessage(channelDetails) {
    const sqs = new AWS.SQS({ region: config.cloudRegion })
    const params = {
        Entries: channelDetails,
        QueueUrl: config.alertProcessSqs
    }
    try {
        const sqsBatchUploadStatus = await sqs.sendMessageBatch(params).promise()
        return sqsBatchUploadStatus
    } catch (error) {
        log.error(`something went's wrong in push items in queue: ` + error)
        return rollbar.error(error)
    }
}

_init()

module.exports = {
    sendSQSMessage: _sendSQSMessage,
    getChannelRecords: _getChannelRecords,
    init: _init
}
