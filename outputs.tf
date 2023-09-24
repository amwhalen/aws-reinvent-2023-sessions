output "bucket_name" {
    value = aws_s3_bucket.website.id
}

output "content_upload_command" {
    value = "aws s3 sync site s3://${aws_s3_bucket.website.id}"
}

output "invoke_lambda_command" {
    value = "aws lambda invoke --function-name ${aws_lambda_function.write_sessions_to_s3.id} lambda_result.txt"
}