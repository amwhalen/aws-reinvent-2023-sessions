
# AWS re:Invent 2023 Session Catalog UI

This code will provision a public static website using AWS S3 to show a web UI for searching and filtering the AWS Re:Invent 2023 Session Catalog. The official AWS re:Invent 2023 session catalog UI had a number of UX issues I was unhappy working with, so I made this instead.

Currently, the site is available at:
http://amw-reinvent-2023.s3-website-us-east-1.amazonaws.com/

Features:
* Faceted search and filtering
* Text search
* Saving favorites (in browser local storage)
* Downloading favorites as CSV
* Responsive design / mobile

![screenshot](https://github.com/amwhalen/aws-reinvent-2023-sessions/blob/main/screenshot.png?raw=true)
![screenshot2](https://github.com/amwhalen/aws-reinvent-2023-sessions/blob/main/screenshot2.png?raw=true)


# AWS Session Data

By examining the official AWS Session catalog site you can see that the session data comes from the following URL:
https://hub.reinvent.awsevents.com/attendee-portal-api/public-catalog/.
This data is not available to other sites due to CORS restrictions.
To solve this issue, a lambda function is triggered (by EventBridge schedule) every 3 hours to read from the official AWS Sessions JSON endpoint. The JSON is manipulated a bit to add some attributes and rearrange things, then it is stored in the website S3 bucket so that it is available to the site locally without CORS issues.


# Tech Stack

![diagram](https://github.com/amwhalen/aws-reinvent-2023-sessions/blob/main/diagram.png?raw=true)

Technologies used in this repository include:
* AWS S3
* AWS Lambda / Python
* AWS CLI
* Terraform
* Vue.js
* ItemsJS
* Bootstrap


# Are you modifying this code? This section is for you.

If you want to change the name of the bucket used, change the following items:
1. The variable `bucket_name` in `terraform.tfvars`.
2. The variable `Bucket` in `lambda.py`.

If you want to provision AWS resources, use terraform:
```
terraform validate
terraform plan
terraform apply
```

If you want to update the static site, sync the site files to S3 with this command:
```
aws s3 sync site s3://amw-reinvent-2023
```


# License

MIT License

Copyright (c) 2023 Andrew M. Whalen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
