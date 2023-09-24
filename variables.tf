variable "bucket_name" {
    description = "bucket name for the static site"
    type = string
}

variable "lambda_function_name" {
    description = "name of the lambda function"
    type = string
}

variable "schedule" {
    description = "cron schedule for the lambda function to execute on"
    type = string
}