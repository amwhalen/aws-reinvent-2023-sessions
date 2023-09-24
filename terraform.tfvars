bucket_name = "amw-reinvent-2023"
lambda_function_name = "reinvent-2023-write-session-catalog-to-s3"
# NOTE: Amazon cron schedule is not standard
# <Minute> <Hour> <Day> <Month> <Day of the week> <Year>
# every 3 hours example: cron(0 */3 * * ? *)
schedule = "cron(0 */3 * * ? *)"