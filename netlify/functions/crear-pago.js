const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { total, descripcion, pedido_id, email } = JSON.parse(event.body);
  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  const preference = {
    items: [{
      title: `Pedido Maicitos ${pedido_id}`,
      quantity: 1,
      currency_id: 'MXN',
      unit_price: Math.round(total),
    }],
    payer: { email },
    external_reference: pedido_id,
    back_urls: {
      success: 'https://maicitospedidos.netlify.app?pago=ok',
      failure: 'https://maicitospedidos.netlify.app?pago=fail',
      pending: 'https://maicitospedidos.netlify.app?pago=pendiente',
    },
    auto_return: 'approved',
    statement_descriptor: 'MAICITOS MX',
  };

  return new Promise((resolve) => {
    const data = JSON.stringify(preference);
    const options = {
      hostname: 'api.mercadopago.com',
      path: '/checkout/preferences',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const result = JSON.parse(body);
        if (result.init_point) {
          resolve({
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ url: result.init_point }),
          });
        } else {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'No se pudo crear el pago', detail: result }),
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });

    req.write(data);
    req.end();
  });
};
