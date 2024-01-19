
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

const { fetchArticles, processArticles } = require('./articulos.js'); // Ajusta la ruta según tu estructura de archivos
var i = 1

const main = async () => {
    const arregloArticulos = await fetchArticles();
    const textoPagina = processArticles(arregloArticulos);
    
    console.log(textoPagina);

    // Nuevo flujo para enviar elementos de un array

    const flowTerciario = addKeyword([(i+1).toString(), 'siguiente']).addAnswer(['más información: '+ textoPagina[i].fragmentoLink,
    'envie *0* para continuar'])

    const flowSecundario = addKeyword([(i+1).toString(), 'siguiente']).addAnswer(
        [textoPagina[i].fragmentoTexto,
        'Mande *'+ (i+1) +'* para más'],
        {capture:true},
        (ctx) => {
            console.log('mensaje recibido: ', ctx.body, ' y ', i)
            if(!isNaN(ctx.body)){
                i = parseInt(ctx.body)
            }
            console.log('mensaje recibido: ', ctx.body, ' y ', i)
        },
        [flowTerciario])

    const flowEnviarArray = addKeyword([(1).toString()]).addAnswer(
        {capture: true},
        async (ctx, {provider}) => {
            await provider.sendImage(ctx.from+'@s.whatsapp.net',
            textoPagina[1].src, 
            '*'+textoPagina[1].fragmentoTitulo+'*')
        }).addAnswer( 'Mande *'+ (1) +'* para más',
        {capture:true},
        (ctx) => {
            console.log('mensaje recibido: ', ctx.body, ' y ', i)
            if(!isNaN(ctx.body)){
                i = parseInt(ctx.body)
            }
            console.log('mensaje recibido: ', ctx.body, ' y ', i)
        },
        [flowSecundario]
    )

    const flowPrincipal = addKeyword(['hola', 'ole', 'alo','0'])
        .addAnswer('🙌 Hola bienvenido a este *Chatbot*')
        .addAnswer(
                'iniciar primer flujo',
                null,
                async (ctx, {provider, flowDynamic}) => {
                    const nuevoArreglo = textoPagina.map(({ indice, fragmentoTitulo, src }) => ({
                        indice,
                        fragmentoTitulo,
                        src,
                    }))
                    for (const e of nuevoArreglo){
                        console.log(e);
                        await flowDynamic(e.indice+" - *"+e.fragmentoTitulo+'* \n '+ e.src);
                    }
                }).addAnswer('Ingrese número:',
                /*{capture:true},
                (ctx) => {
                    console.log('mensaje recibido: ', ctx.body, ' y ', i)
                    if(!isNaN(ctx.body)){
                        i = parseInt(ctx.body)
                    }
                    console.log('mensaje recibido: ', ctx.body, ' y ', i)
                },*/
                [flowEnviarArray]
                )
                
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowPrincipal]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();
