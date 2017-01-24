const grpc = require('grpc');
const Condor = require('../../lib/condor');
const Repeater = require('./repeater');

describe('condor framework', () => {
  let condor, repeaterClient, message, expectedResponse;

  beforeAll(() => {
    // start server
    const options = {
      'host': '127.0.0.1',
      'port': '9999',
    };
    condor = new Condor(options)
      .addService('spec/protos/repeater.proto', 'testapp.repeater.RepeaterService', new Repeater())
      .start();

    // start client
    const repeaterProto = grpc.load('spec/protos/repeater.proto');
    repeaterClient = new repeaterProto.testapp.repeater.RepeaterService('127.0.0.1:9999',
      grpc.credentials.createInsecure());
  });

  afterAll((done) => {
    condor.stop().then(() => {
      done();
    });
  });

  beforeEach(() => {
    message = {'message': 'Welcome to Ecuador!'};
    expectedResponse = {'message': 'You sent: \'Welcome to Ecuador!\'.'};
  });

  describe('simple call', () => {
    it('should respond with the right message', (done) => {
      repeaterClient.simple(message, (error, response) => {
        expect(error).toBeNull();
        expect(response).toEqual(expectedResponse);
        done();
      });
    });
  });

  describe('stream to server', () => {
    it('should respond with the right message', (done) => {
      const expectedResponse = {
        'message': 'You sent: \'Welcome to Ecuador! Bienvenido a Ecuador! Saludos!\'.',
      };
      const stream = repeaterClient.streamToServer((error, response) => {
        expect(response).toEqual(expectedResponse);
        done();
      });
      stream.write('Welcome to Ecuador! ');
      stream.write('Bienvenido a Ecuador! ');
      stream.write('Saludos!');
      stream.end();
    });
  });

  describe('stream to client', () => {
    it('should respond with the right messages', (done) => {
      const stream = repeaterClient.streamToClient(message);
      let count = 0;
      stream.on('data', (data) => {
        expect(data).toEqual(expectedResponse);
        count++;
      });
      stream.on('end', () => {
        expect(count).toEqual(2);
        done();
      });
    });
  });

  describe('bidirectional stream', () => {
    it('should respond with the right messages', (done) => {
      const expectedResponse1 = {'message': 'You sent: \'Welcome!\'.'};
      const expectedResponse2 = {'message': 'You sent: \'Bienvenido!\'.'};
      const stream = repeaterClient.bidirectionalStream();
      let count = 0;
      stream.on('data', (data) => {
        switch (count) {
          case 0:
            expect(data).toEqual(expectedResponse1);
            break;
          case 1:
            expect(data).toEqual(expectedResponse2);
            break;
          default:
            done.fail();
        }
        count++;
      });
      stream.on('end', () => {
        done();
      });
      stream.write('Welcome!');
      stream.write('Bienvenido!');
      stream.end();
    });
  });
});
