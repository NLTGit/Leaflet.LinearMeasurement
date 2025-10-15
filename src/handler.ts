import type { APIGatewayProxyResultV2, APIGatewayProxyEventV2 } from 'aws-lambda';
import { parseAndProcessAoi } from './lib/aoi';

export async function http(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const isBase64 = event.isBase64Encoded;
    const bodyString = isBase64 ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;

    const input = JSON.parse(bodyString);
    const result = parseAndProcessAoi(input);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: { 'content-type': 'application/json' },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      statusCode: 400,
      body: JSON.stringify({ error: message }),
      headers: { 'content-type': 'application/json' },
    };
  }
}
