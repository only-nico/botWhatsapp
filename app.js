import './firebase/config.js';
import {
    getFirestore,
    doc,
    collection,
    getDocs,
    updateDoc,
    getDoc,
    setDoc
} from 'firebase/firestore';

// Importar módulos CommonJS usando importación por defecto
import pkgBot from '@bot-whatsapp/bot';
import QRPortalWeb from '@bot-whatsapp/portal';
import BaileysProvider from '@bot-whatsapp/provider/baileys';
import MockAdapter from '@bot-whatsapp/database/mock';
import { fetchArticlesConcurrently, processArticles } from './articulos.js';

const { EVENTS, createBot, createProvider, createFlow, addKeyword } = pkgBot;

const database = getFirestore();
const cantidad = 3;

const verificarUsuario = async (contexto, textoPagina) => {
    try {
        const resultado = await getDocs(collection(database, 'usuarios'));
        const batch = [];

        for (let docSnap of resultado.docs) {
            let usuario = docSnap.data();
            if (usuario.numeroWhatsapp === contexto.from) {
                const arreglo = agregarNumerosAleatorios(textoPagina, cantidad);
                const usuarioRef = doc(database, 'usuarios', usuario.numeroWhatsapp);
                usuario.arregloActual = arreglo;
                batch.push(updateDoc(usuarioRef, { arregloActual: arreglo }));
                console.log('Usuario existente actualizado.');
                return usuario;
            }
        }

        const arreglo = agregarNumerosAleatorios(textoPagina, cantidad);
        let nuevoUsuario = {
            nombre: contexto.pushName,
            numeroWhatsapp: contexto.from,
            arregloActual: arreglo
        };
        const usuarioRef = doc(database, 'usuarios', nuevoUsuario.numeroWhatsapp);
        batch.push(setDoc(usuarioRef, nuevoUsuario));
        console.log('Usuario agregado a la base de datos.');
        await Promise.all(batch); // Ejecutar todas las operaciones de actualización de una vez

        return nuevoUsuario;
    } catch (error) {
        console.error('Error en verificarUsuario:', error);
        return null;
    }
};

const actualizarRanking = async (codigoUrl) => {
    const articuloRef = doc(database, 'articulosRank', codigoUrl);
    try {
        const articuloDoc = await getDoc(articuloRef);
        if (articuloDoc.exists()) {
            const camposParaActualizar = { vistas: (articuloDoc.data().vistas || 0) + 1 };
            await updateDoc(articuloRef, camposParaActualizar);
            return articuloDoc.data();
        } else {
            const nuevoArticulo = { vistas: 1 };
            await setDoc(articuloRef, nuevoArticulo);
            console.log('Nuevo artículo agregado a la base de datos.');
            return nuevoArticulo;
        }
    } catch (error) {
        console.error('Error en actualizarRanking:', error);
        return null;
    }
};

const agregarPaginaVisitada = async (numeroTelefono, url, id) => {
    try {
        
        const resultado = await getDocs(collection(database, 'usuarios'));
        for (let docSnap of resultado.docs) {
            let usuario = docSnap.data();
            if (usuario.numeroWhatsapp === numeroTelefono) {
                const usuarioRef = doc(database, 'usuarios', usuario.numeroWhatsapp);
                //const partes = url.split("="); no funciona con la nueva pagina, no tiene numeros distintivos en el url
                //console.log(partes);          como alternativa, uso el indice para la base de datos
                //const codigoLink = partes[1];
                const codigoLink = String(id);
                const pathCampoVisitas = `visitas.${codigoLink}`;
                const camposParaActualizar = {
                    [pathCampoVisitas]: (usuario.visitas && usuario.visitas[codigoLink] || 0) + 1
                };
                await updateDoc(usuarioRef, camposParaActualizar);
                await actualizarRanking(codigoLink);
                console.log('Campo visitas actualizado.');
                return { ...usuario, visitas: { ...usuario.visitas, [codigoLink]: (usuario.visitas && usuario.visitas[codigoLink] || 0) + 1 } };
            }
        }
        console.log('Usuario no encontrado.');
    } catch (error) {
        console.error('Error en agregarPaginaVisitada:', error);
        return null;
    }
};

const actualizarUsuario = async (contexto, campo, nuevoValor) => {
    try {
        const resultado = await getDocs(collection(database, 'usuarios'));
        for (let docSnap of resultado.docs) {
            let usuario = docSnap.data();
            if (usuario.numeroWhatsapp === contexto) {
                const usuarioRef = doc(database, 'usuarios', usuario.numeroWhatsapp);
                let camposParaActualizar = { [campo]: nuevoValor };
                await updateDoc(usuarioRef, camposParaActualizar);
                console.log('Campo actualizado.');
                return { ...usuario, [campo]: nuevoValor };
            }
        }
        console.log('Usuario no encontrado.');
    } catch (error) {
        console.error('Error en actualizarUsuario:', error);
        return null;
    }
};

function agregarNumerosAleatorios(array, tamaño) {
    const maxLength = array.length;
    tamaño = Math.min(tamaño, maxLength);
    let indicesAleatorios = new Set();
    while (indicesAleatorios.size < tamaño) {
        let numeroAleatorio = Math.floor(Math.random() * maxLength);
        indicesAleatorios.add(numeroAleatorio);
    }
    return Array.from(indicesAleatorios);
}

const main = async () => {
    try {
        console.log('Uso inicial de memoria:', process.memoryUsage());
        const arregloArticulos = await fetchArticlesConcurrently(3); // Limitar concurrencia
        console.log('Uso de memoria después de fetchArticles:', process.memoryUsage());
        
        const textoPagina = await processArticles(arregloArticulos);
        console.log('Uso de memoria después de processArticles:', process.memoryUsage());
        let art = 1;
        let user;
        const arregloAleatorio = [];
        const indicesUsados = [];

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

        const flowDespedida = addKeyword(['chao', 'CHAO', 'Chao', 'adios', 'Contactar', 'contactar', 'Contactar'], { sensitive: true })
            .addAnswer('Gracias por haber sostenido esta conversación. Recuerda, soy Lara la divulgadora de innovaciones de la UACh')
            .addAnswer('Puedes escribirme a oficina.otl@uach.cl o seguirme en instagram https://www.instagram.com/otl_uach/')
            .addAction(
                async (_, { flowDynamic }) => {
                    await flowDynamic([
                        {
                            body: 'Comparte mi contacto con esta imagen, o con el siguiente link \nhttps://wa.me/qr/URVPLRVME6GNM1',
                            media: 'imgs/laraqr.jpg'
                        }
                    ]);
                    }   
            );

        const flowTerciario = addKeyword('3', { sensitive: true }).addAction(
            async (_, { flowDynamic, state }) => {
                const myState = state.getMyState();
                return await flowDynamic('más información: ' + textoPagina[myState.i - 1].fragmentoLink + '\n\nEstamos muy agradecidos de esta conversación contigo. Te proponemos seguir conociendo un poco más sobre innovaciones? \nDigita *Reset* para que te comparta otras tres iniciativas\n\nSi te interesa ser contactado en las próximas horas por una persona de la Dirección de Innovación UACh, digita *Contactar*');
            });

        const flowAcademico = addKeyword('2', { sensitive: true })
            .addAction(
                async (_, { flowDynamic, state }) => {
                    try {
                        const myState = state.getMyState();
                        const e = textoPagina[myState.i - 1];
                        let imagen = e.imgSrc;
                        console.log(imagen);
                        await flowDynamic([{
                            body: `${e.indice} - *${e.fragmentoTitulo}* \n El investigador responsable de este proyecto es *${e.headingText}* \n\nExcelente ¿Quieres seguir conociendo un poco más sobre esta innovación? Digita *3* \n\n¿Quieres explorar información sobre otras innovaciones? Digita *Reset*`,
                            media: imagen
                        }]);
                    } catch (error) {
                        console.error('Error en flowAcademico:', error);
                        // Manejo adicional si es necesario
                    }
                }, [flowTerciario]
            );
        
        const flowSecundario = addKeyword('1', { sensitive: true }).addAction(
            async (_, { flowDynamic, state }) => {
                const myState = state.getMyState();
                return await flowDynamic(textoPagina[myState.i-1].indice+" - *"+textoPagina[myState.i-1].fragmentoTitulo+"*\n\n"+ textoPagina[myState.i - 1].solutionText);
            }, [flowAcademico])
            .addAction(async (_, { flowDynamic}) => {
                await flowDynamic([{
                    body: `Muy bien, gracias por interesarte en nuestro trabajo \n¿Quieres seguir conociendo un poco más sobre esta innovación? Digita *2* \n\n¿Quieres explorar información sobre otras innovaciones? Digita *Reset*`,
                }]);
            }, [flowAcademico]);;

        const flowEnviarArray = addKeyword('0', { sensitive: true })
            .addAction(
                async (_, { flowDynamic, state }) => {
                    const myState = state.getMyState();
                    const e = textoPagina[myState.i-1];
                    await flowDynamic([{
                        body: `${e.indice} - *${e.fragmentoTitulo}* \n${e.problematicText}`,
                        media: textoPagina[myState.i - 1].src
                    }]);
                })
            .addAction(async (_, { flowDynamic}) => {
                await flowDynamic([{
                    body: `Excelente ¿Quieres seguir conociendo un poco más sobre esta innovación? Digita *1* \n\n¿Quieres explorar información sobre otras innovaciones? Digita *Reset*`,
                }]);
            }, [flowSecundario]);


        const flowPrincipal2 = addKeyword(["iniciar", "Iniciar", "INICIAR", "Return", "RETURN", "return"], { sensitive: true }).addAnswer(
            'espere un momento, se están generando artículos...',
            { delay: 1000 },
            async (_, { provider, flowDynamic }) => {
                try {
                    for (let index = 0; index < cantidad; index++) {
                        const itemIndex = user.arregloActual;
                 
                        // Verificar que el índice esté dentro del rango de `textoPagina`
                        if (itemIndex[index] >= 0 && itemIndex[index] < textoPagina.length ) {
                            const e = textoPagina[itemIndex[index]];
                            
                            // Verificar que `e` tenga la estructura esperada
                            if (e && e.indice !== undefined && e.fragmentoTitulo && e.fragmentoTexto) {
                                let bodyMessage; 
                                if (index === cantidad - 1) {
                                    bodyMessage = `${e.indice} - *${e.fragmentoTitulo}* \n${e.fragmentoTexto}\n\nAhora ingresa el número de la innovación sobre la que deseas conocer un poco más...`;
                                } else {
                                    bodyMessage = `${e.indice} - *${e.fragmentoTitulo}* \n${e.fragmentoTexto}`;
                                }
                
                                // Asegúrate de que `e.src` esté definido
                                const mediaSrc = e.src || '';  // Usa una cadena vacía si `e.src` es `undefined`
                                
                                try {/*
                                    console.log('Enviando mensaje:', {
                                        body: bodyMessage,
                                        media: mediaSrc
                                    });*/
                                    await flowDynamic([
                                        {
                                            body: bodyMessage,
                                            media: mediaSrc
                                        }
                                    ]);
                                } catch (error) {
                                    console.error('Error durante la ejecución de flowDynamic:', error);
                                }
                            } else {
                                console.error('Elemento de textoPagina no tiene la estructura esperada:', e);
                            }
                        } else {
                            console.error(`Índice fuera de rango: ${itemIndex[index]}`);
                        }
                    }
                } catch (error) {
                    // Captura y muestra el stack trace del error
                    console.error('Error en la construcción del mensaje en flowPrincipal2:', error.message);
                    console.error('Stack trace:', error.stack);
                }
                
                
            }).addAction(
                { capture: true },
                async (ctx, { gotoFlow, state }) => {
                    console.log('mensaje recibido: ', ctx.body, ' y ', art);
                    if (!isNaN(ctx.body)) {
                        try {
                            await state.update({ i: parseInt(ctx.body) });
                        } catch (error) {
                            console.log(error);
                        }
                        user = await agregarPaginaVisitada(user.numeroWhatsapp, textoPagina[parseInt(ctx.body)-1].fragmentoLink, textoPagina[parseInt(ctx.body)-1].indice);
                        return gotoFlow(flowEnviarArray);
                    }
                    console.log('mensaje recibido: ', ctx.body, ' y ', art);
                }
            );

        const flowPrincipal3 = addKeyword(["reset", "Reset", "RESET"], { sensitive: true }).addAnswer(
            'generando artículos...',
            { delay: 1000 },
            async (ctx, { provider, flowDynamic }) => {
                const arreglo = agregarNumerosAleatorios(user.arregloActual, textoPagina.length);
                user = await actualizarUsuario(user.numeroWhatsapp, "arregloActual", arreglo);
                for (let index = 0; index < cantidad; index++) {
                    const e = textoPagina[user.arregloActual[index]];
                    let bodyMessage;
                    if (index === cantidad - 1) {
                        bodyMessage = `${e.indice} - *${e.fragmentoTitulo}* \n${e.fragmentoTexto}\n\nAhora ingresa el número de la innovación sobre la que deseas conocer un poco más...`;
                    } else {
                        bodyMessage = `${e.indice} - *${e.fragmentoTitulo}* \n${e.fragmentoTexto}`;
                    }
                    try {
                        await flowDynamic([
                            {
                                body: bodyMessage,
                                media: e.src
                            }
                        ]);
                    } catch (error) {
                        console.error('Error durante la ejecución de flowDynamic:', error);
                    }
                }
            }).addAction({ capture: true },
                async (ctx, { gotoFlow, state }) => {
                    if (!isNaN(ctx.body)) {
                        try {
                            await state.update({ i: parseInt(ctx.body) });
                        } catch (error) {
                            console.log(error);
                        }
                        user = await agregarPaginaVisitada(user.numeroWhatsapp, textoPagina[parseInt(ctx.body)-1].fragmentoLink, textoPagina[parseInt(ctx.body)-1].indice);
                        return gotoFlow(flowEnviarArray);
                    }
                }
            );

        const flowPrincipal = addKeyword(EVENTS.WELCOME, { sensitive: true })
            .addAction(async (ctx, { flowDynamic }) => {
                user = await verificarUsuario(ctx, textoPagina);
                await flowDynamic([
                    {
                        body: 'Hola ' + ctx.pushName + ', bienvenido/a, mi nombre es *Lara* y soy una *divulgadora de innovaciones* de la Universidad Austral de Chile.',
                        media: 'imgs/lara3.jpg'
                    }
                ]);
            })
            .addAnswer('Quiero que sepas que hay varias iniciativas que pueden resultar valiosas para tu institución o comunidad.', { delay: 1000 })
            .addAnswer('Ingresa la palabra *Iniciar* para comenzar a dialogar sobre innovaciones', { delay: 1000 });

        const adapterDB = new MockAdapter();
        const adapterFlow = createFlow([flowPrincipal, flowPrincipal2, flowPrincipal3, flowEnviarArray, flowSecundario, flowAcademico, flowTerciario, flowDespedida]);
        const adapterProvider = createProvider(BaileysProvider);

        createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        });

        QRPortalWeb();
    } catch (error) {
        console.error('Error en main:', error);
    }
};

main();
