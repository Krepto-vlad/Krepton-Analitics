jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

import { readFile } from 'node:fs/promises';
import { getOpenApiDocument } from '../../../controllers/docsController.js';
import { OPENAPI_SPEC_CONTENT_TYPE } from '../../../constants.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedRead = readFile as jest.MockedFunction<typeof readFile>;

describe('docsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves the OpenAPI document', async () => {
    mockedRead.mockResolvedValue('openapi: 3.0.0');
    const res = createMockResponse();

    await getOpenApiDocument(createMockRequest(), asResponse(res));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.type).toHaveBeenCalledWith(OPENAPI_SPEC_CONTENT_TYPE);
    expect(res.send).toHaveBeenCalledWith('openapi: 3.0.0');
  });

  it('throws 500 when the spec file is missing', async () => {
    mockedRead.mockRejectedValue(new Error('ENOENT'));

    await expect(
      getOpenApiDocument(createMockRequest(), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});
