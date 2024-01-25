
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const { fetchArticles, processArticles } = require('./articulos.js'); // Ajusta la ruta según tu estructura de archivos

const miURL = 'https://encuentro.migracionescomunicativas.cl/wp-json/wp/v2/posts/';
const main = async () => {
    const arregloArticulos = await fetchArticles(miURL);
    const textoPagina = processArticles(arregloArticulos);
    let art = 1
    let num = 0
    let contador=0
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Puedes hacer algo adicional aquí si es necesario
    });
    const arregloAleatorio = [];
    const indicesUsados=[];
    for (let index = 0; index < 6; index++) {
        let numeroEnteroAleatorio;
    
        // Generar un índice aleatorio que no se haya usado antes
        do {
            numeroEnteroAleatorio = Math.floor(Math.random() * textoPagina.length);
        } while (indicesUsados.includes(numeroEnteroAleatorio));
            // Guardar el índice para evitar repeticiones
            indicesUsados.push(numeroEnteroAleatorio);
            // Añadir el elemento correspondiente al arregloAleatorio
            arregloAleatorio.push(textoPagina[numeroEnteroAleatorio]);
    }

    // Nuevo flujo para enviar elementos de un array

    const flowTerciario = addKeyword('2',  { sensitive: true }).addAction(
        async (_, {flowDynamic, state}) => {
            const myState = state.getMyState()
            return await flowDynamic('mas información: '+ textoPagina[myState.i-1].fragmentoLink+'\n\nIngrese *reset* para reiniciar o *return* para volver');
        })
        
    const flowSecundario = addKeyword('1', { sensitive: true }).addAction(
        async (_, {flowDynamic, state}) => {
            const myState = state.getMyState()
            return await flowDynamic(textoPagina[myState.i-1].fragmentoTexto+"\n\nMande *2* para más \nMande *reset* para reiniciar");
        },[flowTerciario])
        

    const flowEnviarArray = addKeyword('0', { sensitive: true })
        .addAction(
        async (_, {flowDynamic, state}) => {
            const myState = state.getMyState()
            await flowDynamic([{
                body: textoPagina[myState.i-1].fragmentoTitulo + "\n\nMande *1* para más \nMande *reset* para reiniciar",
                media: textoPagina[myState.i-1].src
        }]);
        },[flowSecundario])
        

    const flowPrincipal2=addKeyword(["iniciar","Iniciar","INICIAR","Return","RETURN","return"],{sensitive:true}).addAnswer(
        'generando artículos...',
        {delay:1000},
        async (_, {provider, flowDynamic}) => {
            for (let index = 0; index < arregloAleatorio.length; index++) {
                const e = arregloAleatorio[index];
                let bodyMessage;
                
                // Verificar si es la última iteración
                if (index === arregloAleatorio.length - 1) {
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
        async (ctx, { gotoFlow, state }) => {
            console.log('mensaje recibido: ', ctx.body, ' y ', art);
            if (!isNaN(ctx.body)) {
                try{
                await state.update({i:parseInt(ctx.body)})
            } catch (error){
                console.log(error)
            }
                return gotoFlow(flowEnviarArray);
            }
            console.log('mensaje recibido: ', ctx.body, ' y ', art);
        }
    )
    const flowPrincipal3=addKeyword(["reset","Reset","RESET"],{sensitive:true}).addAnswer(
        'generando artículos...',
        {delay:1000},
        async (ctx, {provider, flowDynamic}) => {
            arregloAleatorio.splice(0, arregloAleatorio.length);
            contador+=1;
            console.log(indicesUsados);
            if(contador==3){
                indicesUsados.splice(0, indicesUsados.length);
                contador=0;
            }
            for (let index = 0; index < 6; index++) {
                let numeroEnteroAleatorio;
                // Generar un índice aleatorio que no se haya usado antes
                do {
                    numeroEnteroAleatorio = Math.floor(Math.random() * textoPagina.length);
                } while (indicesUsados.includes(numeroEnteroAleatorio));
            
                // Guardar el índice para evitar repeticiones
                indicesUsados.push(numeroEnteroAleatorio);
            
                // Añadir el elemento correspondiente al arregloAleatorio
                arregloAleatorio.push(textoPagina[numeroEnteroAleatorio]);
            }
            for (let index = 0; index < arregloAleatorio.length; index++) {
                const e = arregloAleatorio[index];
                let bodyMessage;
                
                // Verificar si es la última iteración
                if (index === arregloAleatorio.length - 1) {
                    bodyMessage = e.indice + " - *" + e.fragmentoTitulo + "* \n\nIngrese el índice del artículo:";
                } else {
                    bodyMessage = e.indice + " - *" + e.fragmentoTitulo + "* \n";
                }
                try{
                await flowDynamic([
                    {
                        body: bodyMessage,
                        media: e.src
                    }
                ])}
                catch (error) {
                    console.error('Error durante la ejecución de flowDynamic:', error);
                }
            }
            
        }).addAction('',
        {capture:true},
        async (ctx, { gotoFlow, state }) => {
            if (!isNaN(ctx.body)) {
                try{
                    await state.update({i:parseInt(ctx.body)})
                } catch (error){
                    console.log(error)
                }
                return gotoFlow(flowEnviarArray);
            }
        }
    )
    const flowPrincipal = addKeyword('hola',"HOLA","Hola","OLA","Ola","ola","ALO","alo","Alo", {sensitive:true})
        .addAction(async (ctx,{flowDynamic})=>{
            await flowDynamic([
                {
                    body: '🙌 Bienvenido '+ctx.pushName+', mi nombre es *Lara*',
                    media:'https://i.pinimg.com/originals/f4/7c/59/f47c59a85004cfed5655f69faca5341d.jpg'
                }
            ])})
        .addAnswer('Ingrese *iniciar* para comenzar a utilizar el bot')

    const adapterDB = new MockAdapter();
    const adapterFlow = createFlow([flowPrincipal,flowPrincipal2,flowPrincipal3, flowEnviarArray, flowSecundario, flowTerciario]);
    const adapterProvider = createProvider(BaileysProvider);

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    });

    QRPortalWeb();
};

main();
