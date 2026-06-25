import { of, throwError, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PagoSimpleHttpGateway } from './pago-simple-http.gateway';

const CONFIG: Record<string, string> = {
  PAGOSIMPLE_BASE_URL: 'https://ps.test/',
  PAGOSIMPLE_DOCUMENT_TYPE: 'CC',
  PAGOSIMPLE_DOCUMENT: '15436453',
  PAGOSIMPLE_PASSWORD: 'pw',
  PAGOSIMPLE_NIT: '800167494',
  PAGOSIMPLE_COMPANY: 'co',
  PAGOSIMPLE_SECRET_KEY: 'sk',
  PAGOSIMPLE_TIMEOUT_MS: '50',
  PAGOSIMPLE_TOKEN_TTL_MS: '60000',
};

const loginOk = { data: { success: true, code: 200, data: { token: 'TOK' } } };

const bduaRegistro = {
  affiliate_type: 'C',
  bdua_administrator_name: 'EPS SURA',
  bdua_affiliate_date: '20200115',
  ruaf_administrator_name: 'PORVENIR',
  ruaf_affiliate_date: '2021-06-01',
};
const bduaOk = { data: { success: true, code: 200, data: [bduaRegistro] } };

function crearGateway(post: jest.Mock): PagoSimpleHttpGateway {
  const http = { post } as unknown as HttpService;
  const config = {
    get: jest.fn((k: string) => CONFIG[k]),
  } as unknown as ConfigService;
  return new PagoSimpleHttpGateway(http, config);
}

const esLogin = (url: string) => url.endsWith('/auth/login');
const esBdua = (url: string) => url.endsWith('/bdua-ruaf/data');

describe('PagoSimpleHttpGateway', () => {
  it('hace login, consulta BDUA/RUAF y mapea el primer registro', async () => {
    const post: jest.Mock = jest.fn((url: string) =>
      esLogin(url) ? of(loginOk) : of(bduaOk),
    );
    const gateway = crearGateway(post);

    const snapshot = await gateway.consultarSeguridadSocial('CC', '15436453');

    expect(snapshot).toEqual({
      eps: 'EPS SURA',
      epsFechaAfiliacion: new Date(Date.UTC(2020, 0, 15)),
      afp: 'PORVENIR',
      afpFechaAfiliacion: new Date(Date.UTC(2021, 5, 1)),
      tipoAfiliado: 'C',
      origen: 'PAGOSIMPLE',
    });
    // login envía body con credenciales; BDUA envía headers nit + token.
    const bduaCall = post.mock.calls.find((c) => esBdua(c[0]));
    expect(bduaCall?.[2]).toEqual({
      headers: { nit: '800167494', token: 'TOK' },
    });
  });

  it('normaliza el tipo de documento antes de consultar', async () => {
    const post: jest.Mock = jest.fn((url: string) =>
      esLogin(url) ? of(loginOk) : of(bduaOk),
    );
    const gateway = crearGateway(post);

    await gateway.consultarSeguridadSocial(' cc ', '15436453');

    const bduaCall = post.mock.calls.find((c) => esBdua(c[0]));
    expect(bduaCall?.[1]).toEqual({
      document_type: 'CC',
      document: '15436453',
    });
  });

  it('devuelve null cuando la respuesta no trae registros', async () => {
    const post: jest.Mock = jest.fn((url: string) =>
      esLogin(url) ? of(loginOk) : of({ data: { data: [] } }),
    );
    const gateway = crearGateway(post);

    expect(await gateway.consultarSeguridadSocial('CC', '1')).toBeNull();
  });

  it('devuelve null cuando data no es un arreglo (respuesta malformada)', async () => {
    const post: jest.Mock = jest.fn((url: string) =>
      esLogin(url) ? of(loginOk) : of({ data: { data: 'nope' } }),
    );
    const gateway = crearGateway(post);

    expect(await gateway.consultarSeguridadSocial('CC', '1')).toBeNull();
  });

  it('devuelve null cuando el login no trae token', async () => {
    const post: jest.Mock = jest.fn((url: string) =>
      esLogin(url) ? of({ data: { data: {} } }) : of(bduaOk),
    );
    const gateway = crearGateway(post);

    expect(await gateway.consultarSeguridadSocial('CC', '1')).toBeNull();
  });

  it('reintenta una vez con token fresco ante 401 en BDUA/RUAF', async () => {
    let bduaCalls = 0;
    const post: jest.Mock = jest.fn((url: string) => {
      if (esLogin(url)) return of(loginOk);
      bduaCalls += 1;
      return bduaCalls === 1
        ? throwError(() => ({ isAxiosError: true, response: { status: 401 } }))
        : of(bduaOk);
    });
    const gateway = crearGateway(post);

    const snapshot = await gateway.consultarSeguridadSocial('CC', '1');

    expect(snapshot?.eps).toBe('EPS SURA');
    expect(post.mock.calls.filter((c) => esLogin(c[0]))).toHaveLength(2);
    expect(bduaCalls).toBe(2);
  });

  it('devuelve null ante timeout', async () => {
    const post: jest.Mock = jest.fn((url: string) =>
      esLogin(url) ? of(loginOk) : timer(1000).pipe(map(() => bduaOk)),
    );
    const gateway = crearGateway(post);

    expect(await gateway.consultarSeguridadSocial('CC', '1')).toBeNull();
  });
});
