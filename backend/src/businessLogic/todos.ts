import { TodosAccess } from '../dataLayer/todosAcess'
import { TodoItem } from '../models/TodoItem'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import * as uuid from 'uuid'
import { parseUserId } from '../auth/utils';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { getUserId } from '../lambda/utils';

// TODO: Implement businessLogic

const todoAccess = new TodosAccess()

export async function getAllTodoItems(userId: string): Promise<TodoItem[]> {
  return todoAccess.getTodosByUserId(userId)
}

export async function createTodoItem(
  createTodoItemRequest: CreateTodoRequest,
  jwtToken: string
): Promise<TodoItem> {

  const itemId = uuid.v4()
  const userId = parseUserId(jwtToken)

  return await todoAccess.createTodo({
    ...createTodoItemRequest,
    userId: userId,
    todoId: itemId,
    createdAt: new Date().toISOString(),
    done: false,
    attachmentUrl: "",
  })
}

export async function deleteTodo(event: APIGatewayProxyEvent): Promise<String> {
    console.log('delete Todo running...', { event })
    return todoAccess.deleteTodo({
        todoId: event.pathParameters.todoId,
        userId: getUserId(event)
    })
}

export async function updateTodo(todo: TodoItem): Promise<String> {
    console.log('update Todo running...', { todo })
    return todoAccess.updateTodo(todo)
}

export async function generateUploadUrl(event: APIGatewayProxyEvent): Promise<String> {
    console.log('generateUploadUrl')
    return todoAccess.generateUploadUrl({
        todoId: event.pathParameters.todoId,
        userId: getUserId(event)
    })
}

