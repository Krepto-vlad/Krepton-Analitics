import { CLIENT_ERROR_LOG_PREFIX } from '../../constants';
import { logClientError } from '../clientErrorLog';

describe('logClientError', () => {
  it('logs the error message with an optional component stack', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    logClientError(new Error('Boom'), ' at Dashboard');

    expect(consoleErrorSpy).toHaveBeenCalledWith(CLIENT_ERROR_LOG_PREFIX, 'Boom', ' at Dashboard');
    consoleErrorSpy.mockRestore();
  });
});
