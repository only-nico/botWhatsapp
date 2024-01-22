
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

const { fetchArticles, processArticles, processText } = require('./articulos.js'); // Ajusta la ruta según tu estructura de archivos

const miURL = 'https://encuentro.migracionescomunicativas.cl/wp-json/wp/v2/posts/';
const main = async () => {
    const arregloArticulos = await fetchArticles(miURL);
    const textoPagina = processArticles(arregloArticulos);
    let i = 1
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Puedes hacer algo adicional aquí si es necesario
    });

    // Nuevo flujo para enviar elementos de un array

    const flowTerciario = addKeyword('2',  { sensitive: true }).addAction(
        async (_, {flowDynamic}) => {
            console.log(textoPagina[i-1].fragmentoLink)
            return await flowDynamic('mas información: '+ textoPagina[i-1].fragmentoLink);
        }).addAnswer('ingrese *reset* para reiniciar')
        
    const flowSecundario = addKeyword('1', { sensitive: true }).addAction(
        async (_, {flowDynamic}) => {
            console.log(textoPagina[i-1].fragmentoTexto)
            return await flowDynamic(textoPagina[i-1].fragmentoTexto);
        })
        .addAnswer(
        'Mande *2* para más \nMande *reset* para reiniciar',
        {delay:10000},
        [flowTerciario])

    const flowEnviarArray = addKeyword('0', { sensitive: true })
        .addAnswer(
        'Mande *1* para más \nMande *reset* para reiniciar',
        {delay:5000}
        ,[flowSecundario]
    ).addAction(
        async (_, {flowDynamic}) => {
            console.log(textoPagina[i-1].fragmentoTitulo)
            return await flowDynamic({
                body: textoPagina[i-1].fragmentoTitulo,
                media: {media:'https://www.sammobile.com/wp-content/uploads/2021/06/samantha_3.jpg'}}
                );
        })

    const flowPrincipal2=addKeyword(["iniciar","reset"]).addAnswer(
        'generando artículos...',
        {delay:1000},
        async (ctx, {provider, flowDynamic}) => {
            const nuevoArreglo = textoPagina.map(({ indice, fragmentoTitulo, src }) => ({
                indice,
                fragmentoTitulo,
                src,
            }))
            for (const e of nuevoArreglo){
                await flowDynamic([
                    
                        e.indice+" - *"+e.fragmentoTitulo+'* \n '+ e.src
                    
                ]);
            }
        }).addAnswer('Ingrese el índice del artículo:',
        {capture:true},
        async (ctx, { gotoFlow }) => {
            if (!isNaN(ctx.body)) {
                i = parseInt(ctx.body);
            }
            return gotoFlow(flowEnviarArray);
        }
    )
    const flowPrincipal = addKeyword('hola', {sensitive:true})
        .addAnswer('🙌 Bienvenido, mi nombre es *Lara*',
        {media:'https://www.sammobile.com/wp-content/uploads/2021/06/samantha_3.jpg'})
        .addAnswer('Ingrese *iniciar* para comenzar a utilizar el bot:',
                {capture:true},
                async (ctx, { gotoFlow }) => {
                    console.log('mensaje recibido: ', ctx.body, ' y ', i);
                    if (!isNaN(ctx.body)) {
                        i = parseInt(ctx.body);
                    }
                    console.log('mensaje recibido: ', ctx.body, ' y ', i);
                    return gotoFlow(flowPrincipal2);
                }
            )
    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowPrincipal,flowPrincipal2, flowEnviarArray, flowSecundario, flowTerciario]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();
