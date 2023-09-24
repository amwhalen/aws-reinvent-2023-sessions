import boto3
import json
import urllib3
from datetime import datetime

def get_url_as_object(url):
	http = urllib3.PoolManager()
	response = http.request('GET', url)
	data = response.data
	return json.loads(data)


def get_session_catalog():
	url = "https://hub.reinvent.awsevents.com/attendee-portal-api/public-catalog/"
	data = get_url_as_object(url)

	# make the tags into a better format in the JSON to play nicer with ItemsJS
	new_array = []
	for r in data['data']:
		new_obj = r
		for t in r['tags']:
			simple_tag_name = 'aws_tag_{}'.format(t['parentTagName'].replace(" ", "_").lower())
			if simple_tag_name not in new_obj:
				new_obj[simple_tag_name] = []
			new_obj[simple_tag_name].append(t['tagName'])
		# set favorites to false
		new_obj['my_favorites'] = 'No'
		new_array.append(new_obj)

	# set last generated datetime
	now = datetime.now()
	dt_string = now.strftime("%Y-%m-%d %H:%M:%S")

	# create new dict to return
	new_dict = {
		'meta': {
			'generated_datetime': dt_string
		},
		'data': new_array
	}
	return new_dict


def write_json_to_s3(obj):
	s3 = boto3.client('s3')
	s3.put_object(
	     Body=json.dumps(obj),
	     Bucket='amw-reinvent-2023',
	     Key='sessions.json',
	     ContentType='application/json'
	)


def lambda_handler(event, context):
	# This is the first function called by Lambda
	write_json_to_s3(get_session_catalog())
	return True

