
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

const { fetchArticles, processArticles, processText } = require('./articulos.js'); // Ajusta la ruta según tu estructura de archivos

const miURL = 'https://encuentro.migracionescomunicativas.cl/wp-json/wp/v2/posts/';
const main = async () => {
    const arregloArticulos = await fetchArticles(miURL);
    const textoPagina = processArticles(arregloArticulos);
    for (const elemento of textoPagina) {
        const texto = await processText(elemento.fragmentoLink);
        console.log(texto);
    }
    var i = 0

    console.log(textoPagina);

    // Nuevo flujo para enviar elementos de un array

    const flowTerciario = addKeyword([(i+1).toString(), 'siguiente']).addAnswer(['más información: '+ textoPagina[i].fragmentoLink,
    'Envíe *0* para continuar'],        
    { capture: true},
    async (ctx, { flowDynamic, endFlow }) => {
        if (ctx.body == '0')

        return endFlow({body: '❌ Regresando... ❌'})
        })
        
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

    const flowEnviarArray = addKeyword([(i+1).toString()]).addAnswer(
        '*'+textoPagina[i].fragmentoTitulo+'*',
        'https://encuentro.migracionescomunicativas.cl/wp-content/uploads/imagen-destacada-1024x538.webp')
        .addAnswer( 
        'Mande *'+ (i+1) +'* para más',
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

    const flowChao = addKeyword('chao')
    .addAnswer(
    '👋 Hola bienvenido a PanaCambios, tú BOT para compra y venta de divisas.',
    {media:'https://encuentro.migracionescomunicativas.cl/wp-content/uploads/nn-3-1024x768.jpg'}
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
                        console.log(textoPagina[i].src)
                    }
                }).addAnswer('Ingrese número:',
                {capture:true},
                (ctx) => {
                    console.log('mensaje recibido: ', ctx.body, ' y ', i)
                    if(!isNaN(ctx.body)){
                        i = parseInt(ctx.body)
                    }
                    console.log('mensaje recibido: ', ctx.body, ' y ', i)
                    //await gotoFlow(flowEnviarArray)
                },
                [flowEnviarArray]
            )
        
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowPrincipal, flowChao]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();
