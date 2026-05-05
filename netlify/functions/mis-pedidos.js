const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { email } = JSON.parse(event.body);
  if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };

  const SHEET_ID = '1xVOYrDRP18DuE6mq2lp4At9H4ucuJgHxOMyN8rgasp4';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;

  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const lines = data.trim().split('\n');

          const parseCSVLine = (line) => {
            const cols = [];
            let cur = '', inQ = false;
            for (let i = 0; i < line.length; i++) {
              const ch = line[i];
              if (ch === '"') {
                inQ = !inQ;
              } else if (ch === ',' && !inQ) {
                cols.push(cur);
                cur = '';
              } else {
                cur += ch;
              }
            }
            cols.push(cur);
            return cols;
          };

          const clean = c => (c || '').replace(/^"|"$/g, '').replace(/""/g, '"').trim();

          const pedidos = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const cols = parseCSVLine(line);
              return {
                fecha:      clean(cols[0]),
                pedido:     clean(cols[1]),
                nombre:     clean(cols[2]),
                email:      clean(cols[3]),
                productos:  clean(cols[6]),
                total:      clean(cols[7]),
                estatus:    clean(cols[10]) || 'PENDIENTE',
                paqueteria: clean(cols[11]) || '',
                guia:       clean(cols[12]) || '',
              };
            })
            .filter(p => p.email.toLowerCase() === email.toLowerCase())
            .reverse();

          resolve({
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pedidos }),
          });

        } catch (parseError) {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Error parsing: ' + parseError.message })
          });
        }
      });
    }).on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });
  });
};
