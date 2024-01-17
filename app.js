
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

const { fetchArticles, processArticles } = require('./articulos.js'); // Ajusta la ruta según tu estructura de archivos
let art1 = ['https://i.imgflip.com/62mxz0.png', 'TITULAR ART1', 'PARRAFO ART1', 'LINK ART 1']
let art2 = ['https://encuentro.migracionescomunicativas.cl/wp-content/uploads/imagen-destacada-1024x538.webp ', 'TITULAR ART2', 'PARRAFO ART2', 'LINK ART 2']
const articulos = [art1, art2]
let i = 0

// Nuevo flujo para enviar elementos de un array

const flowTerciario = addKeyword([(i+1).toString(), 'siguiente']).addAnswer(['más información: '+ articulos[i].pop()])

const flowSecundario = addKeyword([(i+1).toString(), 'siguiente']).addAnswer(
    [articulos[i].pop(),
    'mande '+ (i+1) +' para más'],
    null,
    null,
    [flowTerciario])

const flowEnviarArray = addKeyword([(i+1).toString()]).addAnswer(
    [{media: articulos[i].shift()},
    articulos[i].shift(),
    'mande '+ (i+1) +' para más'],
    null,
    null,
    [flowSecundario]
)

const flowDocs = addKeyword(['doc', 'documentacion', 'documentación']).addAnswer(
    [
        '📄 Aquí encontras las documentación recuerda que puedes mejorarla',
        'https://bot-whatsapp.netlify.app/',
        '\n*2* Para siguiente paso.',
    ],
    null,
    null,
    [flowSecundario]
)

const flowTuto = addKeyword(['tutorial', 'tuto']).addAnswer(
    [
        '🙌 Aquí encontras un ejemplo rapido',
        'https://bot-whatsapp.netlify.app/docs/example/',
        '\n*2* Para siguiente paso.',
    ],
    null,
    null,
    [flowSecundario]
)

const flowGracias = addKeyword(['gracias', 'grac']).addAnswer(
    [
        '🚀 Puedes aportar tu granito de arena a este proyecto',
        '[*opencollective*] https://opencollective.com/bot-whatsapp',
        '[*buymeacoffee*] https://www.buymeacoffee.com/leifermendez',
        '[*patreon*] https://www.patreon.com/leifermendez',
        '\n*2* Para siguiente paso.',
    ],
    null,
    null,
    [flowSecundario]
)

const flowDiscord = addKeyword(['discord']).addAnswer(
    ['🤪 Únete al discord', 'https://link.codigoencasa.com/DISCORD', '\n*2* Para siguiente paso.'],
    null,
    null,
    [flowSecundario]
)

const flowPrincipal = addKeyword(['hola', 'ole', 'alo'])
    .addAnswer('🙌 Hola bienvenido a este *Chatbot*')
    .addAnswer(
            'iniciar primer flujo',
            {capture:true},
            (ctx) => {
                console.log('mensaje recibido: ', ctx.body, ' y ', i)
                if(!isNaN(ctx.body)){
                    i = +ctx.body
                }
                console.log('mensaje recibido: ', ctx.body, ' y ', i)
            }
        ,
        [flowDocs, flowGracias, flowEnviarArray]
    )
const main = async () => {
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowPrincipal]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    const arregloArticulos = await fetchArticles();
    const textoPagina = processArticles(arregloArticulos);
    console.log(textoPagina);
    QRPortalWeb();
};

main();
