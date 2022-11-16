import * as AWS from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'

const AWSXRay = require('aws-xray-sdk')
const XAWS = AWSXRay.captureAWS(AWS)

export class TodosAccess {

    constructor(
        private readonly docClient: DocumentClient = createDynamoDBClient(),
        private readonly todosTable = process.env.TODOS_TABLE,
        private readonly s3 = new AWS.S3({ signatureVersion: 'v4' }),
        private readonly bucketName = process.env.ATTACHMENT_S3_BUCKET,
        private readonly signedUrlExpiration = process.env.SIGNED_URL_EXPIRATION) {
    }

    async getTodosByUserId(userId: string): Promise<TodoItem[]> {
        console.log('Getting all todos for user')
    
        const result = await this.docClient.query({
          TableName: this.todosTable,
          KeyConditionExpression: "userId = :userId",
          ExpressionAttributeValues: {
              ':userId': userId
          }
        }).promise()
  
        const items = result.Items
        return items as TodoItem[]
    }

    async createTodo(todo: TodoItem): Promise<TodoItem> {
      await this.docClient.put({
        TableName: this.todosTable,
        Item: todo
      }).promise()
  
      return todo
    }

    async deleteTodo(todo): Promise<String> {

        const param = {
            TableName: this.todosTable,
            Key: {
                "userId": todo.userId,
                "todoId": todo.todoId
            }
        }

        await this.docClient.delete(param).promise()

        return "todo deleted"
    }

    async updateTodo(todo): Promise<String> {

        const param = {
            TableName: this.todosTable,
            Key: {
                "userId": todo.userId,
                "todoId": todo.todoId
            },
            UpdateExpression: "set #tname = :name, dueDate=:dueDate, done=:done",
            ExpressionAttributeNames: { '#tname': 'name' },
            ExpressionAttributeValues: {
                ":name": todo.name,
                ":dueDate": todo.dueDate,
                ":done": todo.done
            }
        }

        await this.docClient.update(param).promise()

        return "todo updated"
    }

    async generateUploadUrl(todo): Promise<String> {

        const signedUrl = await this.s3.getSignedUrl('putObject', {
            Bucket: this.bucketName,
            Key: todo.todoId,
            Expires: Number(this.signedUrlExpiration)
        })

        const param = {
            TableName: this.todosTable,
            Key: {
                "userId": todo.userId,
                "todoId": todo.todoId
            },
            UpdateExpression: "set attachmentUrl = :url",
            ExpressionAttributeValues: {
                ":url": `https://${this.bucketName}.s3.amazonaws.com/${todo.todoId}`
            }
        }

        await this.docClient.update(param).promise()

        return signedUrl
    }

}

function createDynamoDBClient() {
    if (process.env.IS_OFFLINE) {
      console.log('Creating a local DynamoDB instance')
      return new XAWS.DynamoDB.DocumentClient({
        region: 'localhost',
        endpoint: 'http://localhost:8000'
      })
    }

    return new XAWS.DynamoDB.DocumentClient()
}
