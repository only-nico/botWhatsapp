
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');

const { fetchArticles, processArticles } = require('./articulos.js'); // Ajusta la ruta según tu estructura de archivos

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

            return await flowDynamic('mas información: '+ textoPagina[i-1].fragmentoLink+'\n\nIngrese *reset* para reiniciar');
        })
        
    const flowSecundario = addKeyword('1', { sensitive: true }).addAction(
        async (_, {flowDynamic}) => {
            return await flowDynamic(textoPagina[i-1].fragmentoTexto+"\n\nMande *2* para más \nMande *reset* para reiniciar");
        },[flowTerciario])
        

    const flowEnviarArray = addKeyword('0', { sensitive: true })
        .addAction(
        async (_, {flowDynamic}) => {
            await flowDynamic([{
                body: textoPagina[i-1].fragmentoTitulo + "\n\nMande *1* para más \nMande *reset* para reiniciar",
                media: textoPagina[i-1].src
        }]);
        },[flowSecundario])
        

    const flowPrincipal2=addKeyword(["iniciar","reset"]).addAnswer(
        'generando artículos...',
        {delay:1000},
        async (ctx, {provider, flowDynamic}) => {
            
            for (let index = 0; index < textoPagina.length; index++) {
                const e = textoPagina[index];
                let bodyMessage;
                
                // Verificar si es la última iteración
                if (index === textoPagina.length - 1) {
                    bodyMessage = e.indice + " - *" + e.fragmentoTitulo + "* \n\nIngrese el índice del artículo:";
                } else {
                    bodyMessage = e.indice + " - *" + e.fragmentoTitulo + "* \n";
                }
            
                await flowDynamic([
                    {
                        body: bodyMessage,
                        media: e.src
                    }
                ]);
            }
            
        }).addAction(
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
        {media:'https://i.pinimg.com/originals/f4/7c/59/f47c59a85004cfed5655f69faca5341d.jpg'})
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
