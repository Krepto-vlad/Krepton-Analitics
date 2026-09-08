import { decodeBase64ToBlob, downloadBlobFile, downloadJsonFile } from '../downloadFile';

describe('downloadFile', () => {
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => 'blob:test');
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevoke;
  });

  it('creates a temporary link and clicks it', () => {
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    downloadBlobFile('report.json', new Blob(['{}'], { type: 'application/json' }));
    expect(click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
    click.mockRestore();
  });

  it('serializes JSON before downloading', () => {
    const click = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    downloadJsonFile('data.json', { ok: true });
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('decodes base64 into a blob of the given type', async () => {
    const blob = decodeBase64ToBlob(btoa('hello'), 'text/plain');
    expect(blob.type).toBe('text/plain');
    const text = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(text).toBe('hello');
  });
});
