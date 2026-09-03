jest.mock('../../../services/importService.js', () => ({
  previewBrokerImport: jest.fn(),
  confirmBrokerImport: jest.fn(),
}));

import { confirmImport, previewImport } from '../../../controllers/importController.js';
import { confirmBrokerImport, previewBrokerImport } from '../../../services/importService.js';
import { asResponse, createMockRequest, createMockResponse } from './httpMocks.js';

const mockedPreview = previewBrokerImport as jest.MockedFunction<typeof previewBrokerImport>;
const mockedConfirm = confirmBrokerImport as jest.MockedFunction<typeof confirmBrokerImport>;

describe('importController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('previews an uploaded statement', async () => {
    mockedPreview.mockResolvedValue({ importId: 'imp-1' } as never);
    const res = createMockResponse();

    await previewImport(
      createMockRequest({
        file: { buffer: Buffer.from('csv'), originalname: 'trades.csv' },
      }),
      asResponse(res)
    );

    expect(mockedPreview).toHaveBeenCalledWith('user-1', expect.any(Buffer), 'trades.csv');
  });

  it('rejects preview without a file buffer', async () => {
    await expect(
      previewImport(createMockRequest(), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('confirms a stored import id', async () => {
    mockedConfirm.mockResolvedValue({ importedCount: 1 } as never);
    const res = createMockResponse();

    await confirmImport(createMockRequest({ body: { importId: ' imp-1 ' } }), asResponse(res));

    expect(mockedConfirm).toHaveBeenCalledWith('user-1', 'imp-1');
  });

  it('rejects confirm without importId', async () => {
    await expect(
      confirmImport(createMockRequest({ body: {} }), asResponse(createMockResponse()))
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
