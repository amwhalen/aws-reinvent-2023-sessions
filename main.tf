terraform {
    required_providers {
        aws = {
            version = "~> 5.0"
        }
    }
}

provider "aws" {
    region = "us-east-1"
}

##################################
# S3 public website
#

resource "aws_s3_bucket" "website" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_website_configuration" "website" {
    bucket = aws_s3_bucket.website.bucket

    index_document {
      suffix = "index.html"
    }

    error_document {
        key = "index.html"
    }
}

resource "aws_s3_bucket_cors_configuration" "website" {
  bucket = aws_s3_bucket.website.id  

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }  
}

resource "aws_s3_bucket_acl" "website" {
    bucket = aws_s3_bucket.website.id
    acl    = "public-read"
    depends_on = [aws_s3_bucket_ownership_controls.s3_bucket_acl_ownership]
}

resource "aws_s3_bucket_ownership_controls" "s3_bucket_acl_ownership" {
  bucket = aws_s3_bucket.website.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
  depends_on = [aws_s3_bucket_public_access_block.example]
}

resource "aws_iam_user" "website_bucket" {
  name = "reinvent-2023-bucket-user"
}

resource "aws_s3_bucket_public_access_block" "example" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "website_bucket" {
    bucket = aws_s3_bucket.website.id
    policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "PublicReadGetObject"
        Principal = "*"
        Action = [
          "s3:GetObject",
        ]
        Effect   = "Allow"
        Resource = [
          "arn:aws:s3:::${var.bucket_name}/*"
        ]
      },
    ]
  })
  
  depends_on = [aws_s3_bucket_public_access_block.example]
}

##################################
# Lambda, IAM role, etc.
#

# allows a lambda function to assume this role (trust relationship)
data "aws_iam_policy_document" "lambda_assume_role_policy" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "iam_role_for_lambda" {
  name               = "reinvent-2023-sessions-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role_policy.json
}

resource "aws_iam_role_policy" "lambda_role_policy" {
  name = "reinvent-2023-sessions-lambda-role-policy"
  role = "${aws_iam_role.iam_role_for_lambda.id}"
  # allow writing only to a specific file in the bucket
  # allow writing to logs
  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "VisualEditor0",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${var.bucket_name}/sessions.json"
    },
    {
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
EOF
}

resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = 7
  lifecycle {
    prevent_destroy = false
  }
}

data "archive_file" "lambda" {  
  type = "zip"
  source_file = "${path.module}/lambda/lambda.py"
  output_path = "lambda.zip"
}

resource "aws_lambda_function" "write_sessions_to_s3" {
  # If the file is not in the current working directory you will need to include a
  # path.module in the filename.
  filename         = "lambda.zip"
  function_name    = "${var.lambda_function_name}"
  role             = aws_iam_role.iam_role_for_lambda.arn
  handler          = "lambda.lambda_handler"
  timeout          = 30
  runtime          = "python3.11"
  source_code_hash = data.archive_file.lambda.output_base64sha256
  depends_on       = [aws_cloudwatch_log_group.lambda_log_group]

  # environment {
  #   variables = {
  #     foo = "bar"
  #   }
  # }
}


##########################################################
# EventBridge (AKA CloudWatch Events) Scheduling of Lamba
#

resource "aws_cloudwatch_event_rule" "schedule" {
    name = "reinvent-2023-write-sessions-schedule"
    description = "Schedule for Lambda Function"
    schedule_expression = "${var.schedule}"
}

resource "aws_cloudwatch_event_target" "schedule_lambda" {
    rule = aws_cloudwatch_event_rule.schedule.name
    target_id = "write_sessions_to_s3"
    arn = aws_lambda_function.write_sessions_to_s3.arn
}

resource "aws_lambda_permission" "allow_events_bridge_to_run_lambda" {
    statement_id = "AllowExecutionFromCloudWatch"
    action = "lambda:InvokeFunction"
    function_name = aws_lambda_function.write_sessions_to_s3.function_name
    principal = "events.amazonaws.com"
}
