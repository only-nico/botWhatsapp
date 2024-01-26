
require('./firebase/config.js');
const {
  getFirestore,
  doc,
  collection,
  getDocs,updateDoc,
  getDoc,setDoc
} = require('firebase/firestore');
const { EVENTS } = require('@bot-whatsapp/bot')
const { createBot, createProvider, createFlow, addKeyword } = require('@bot-whatsapp/bot');
const QRPortalWeb = require('@bot-whatsapp/portal');
const BaileysProvider = require('@bot-whatsapp/provider/baileys');
const MockAdapter = require('@bot-whatsapp/database/mock');
const { fetchArticles, processArticles } = require('./articulos.js'); // Ajusta la ruta según tu estructura de archivos
const cantidad=6;
const database=getFirestore();

const verificarUsuario = async (contexto) => {
// Obtén todos los usuarios

    const resultado = await getDocs(collection(database, 'usuarios'));

    // Recorre los usuarios
    for (let doc of resultado.docs) {
        let usuario = doc.data();

        // Comprueba si el número de Whatsapp coincide
        if (usuario.numeroWhatsapp === contexto.from) {
        return usuario;
        }}
    const arreglo=agregarNumerosAleatorios([0,0,0,0,0,0],cantidad);
    let nuevoUsuario = {
        nombre: contexto.pushName,
        numeroWhatsapp: contexto.from,
        arregloActual: arreglo
        };
    
    const usuarioRef = doc(database, 'usuarios', nuevoUsuario.numeroWhatsapp);
    await setDoc(usuarioRef,nuevoUsuario);
    console.log('Usuario agregado a la base de datos.');
    return nuevoUsuario;
    
};
const actualizarRanking = async (codigoUrl) => {
    const articuloRef = doc(collection(database, 'articulosRank'), codigoUrl);
    
    try {
        const articuloDoc = await getDoc(articuloRef);

        if (articuloDoc.exists()) {
            // Si el artículo ya existe, actualiza las vistas
            const camposParaActualizar = { vistas: (articuloDoc.data().vistas || 0) + 1 };
            await updateDoc(articuloRef, camposParaActualizar);
           
            return articuloDoc.data();
        } else {
            // Si el artículo no existe, crea uno nuevo con el códigoUrl como clave
            const nuevoArticulo = {
                vistas: 1
            };
            await setDoc(articuloRef, nuevoArticulo);
            console.log('Nuevo artículo agregado a la base de datos.');
            return nuevoArticulo;
        }
    } catch (error) {
        console.error('Error al actualizar/crear el artículo:', error);
        return null;
    }

};

const agregarPaginaVisitada = async (numeroTelefono, url) => {
    try {
        const resultado = await getDocs(collection(database, 'usuarios'));

        for (let art of resultado.docs) {
            let usuario = art.data();
            if (usuario.numeroWhatsapp === numeroTelefono) {
                
                if (usuario.numeroWhatsapp) {
                    const usuarioRef = doc(collection(database, 'usuarios'), usuario.numeroWhatsapp);
                 
                    // Obtener el códigoLink de la URL
                    const partes = url.split("=");
                    const codigoLink = partes[1];

                    // Crear el path para acceder al campo visitas[codigoLink]
                    const pathCampoVisitas = `visitas.${codigoLink}`;

                    // Actualizar el campo visitas[codigoLink] sumando 1
                    const camposParaActualizar = {
                        [pathCampoVisitas]: (usuario.visitas && usuario.visitas[codigoLink] || 0) + 1
                    };
                    const hola=await actualizarRanking(codigoLink);
                    await updateDoc(usuarioRef, camposParaActualizar);
                    console.log('Campo visitas actualizado.');
                    return { ...usuario };
                } else {
                    console.log('numeroWhatsapp es undefined');
                }
            }
        }
        console.log('Usuario no encontrado.');
    } catch (error) {
        console.error('Se produjo un error:', error);
    }
    return null;
};

const actualizarUsuario = async (contexto, campo, nuevoValor) => {
    try {
        const resultado = await getDocs(collection(database, 'usuarios'));
        for (let art of resultado.docs) {
            let usuario = art.data();
            if (usuario.numeroWhatsapp === contexto) {
                if (usuario.numeroWhatsapp) {
                    const usuarioRef = doc(collection(database, 'usuarios'), usuario.numeroWhatsapp);
                    let camposParaActualizar = { [campo]: nuevoValor };
                    await updateDoc(usuarioRef, camposParaActualizar);
                    console.log('Campo actualizado.');
                    return { ...usuario, [campo]: nuevoValor };
                } else {
                    console.log('numeroWhatsapp es undefined');
                }
            }
        }
        console.log('Usuario no encontrado.');
    } catch (error) {
        console.error('Se produjo un error:', error);
    }
    return null;
};

function agregarNumerosAleatorios(array,tamaño) {
    let copiaArray = [...array]; // Crea una copia del array original
    for (let i = 0; i < cantidad; i++) {
        let numeroAleatorio;
        do {
        numeroAleatorio = Math.floor(Math.random() * tamaño); // Genera un número aleatorio entre 0 y 999
        } while (copiaArray.includes(numeroAleatorio));
        copiaArray[i] = numeroAleatorio; // Reemplaza el número en el índice 'i' con el número aleatorio
    }
    return copiaArray;
    }

  
const miURL = 'https://encuentro.migracionescomunicativas.cl/wp-json/wp/v2/posts/';
const main = async () => {
    const arregloArticulos = await fetchArticles(miURL);
    const textoPagina = processArticles(arregloArticulos);
    let art = 1
    let num = 0
    let contador=0
    let user;
    /*process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        // Puedes hacer algo adicional aquí si es necesario
    });*/
    const arregloAleatorio = [];
    const indicesUsados=[];
    for (let index = 0; index < cantidad; index++) {
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
            
            
            for (let index = 0; index < user.arregloActual.length; index++) {
                const e = textoPagina[user.arregloActual[index]];
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
                user=await agregarPaginaVisitada(user.numeroWhatsapp,textoPagina[parseInt(ctx.body)].fragmentoLink);
                return gotoFlow(flowEnviarArray);
            }
            console.log('mensaje recibido: ', ctx.body, ' y ', art);
        }
    )
    const flowPrincipal3=addKeyword(["reset","Reset","RESET"],{sensitive:true}).addAnswer(
        'generando artículos...',
        {delay:1000},
        async (ctx, {provider, flowDynamic}) => {
            const arreglo=agregarNumerosAleatorios(user.arregloActual,textoPagina.length);
            user= await actualizarUsuario(user.numeroWhatsapp,"arregloActual",arreglo);
            for (let index = 0; index < cantidad; index++) {
                const e = textoPagina[user.arregloActual[index]];
                let bodyMessage;
                
                // Verificar si es la última iteración
                if (index === cantidad- 1) {
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
                user=await agregarPaginaVisitada(user.numeroWhatsapp,textoPagina[parseInt(ctx.body)].fragmentoLink);
                return gotoFlow(flowEnviarArray);
            }
        }
    )
    const flowPrincipal = addKeyword(EVENTS.WELCOME, {sensitive:true})
        .addAction(async (ctx,{flowDynamic})=>{
            user= await verificarUsuario(ctx);
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
