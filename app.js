import './firebase/config.js'; // Mantén la importación de configuración
import {
    getFirestore,
    doc,
    collection,
    getDocs,
    updateDoc,
    getDoc,
    setDoc
} from 'firebase/firestore';
import cron from 'node-cron';
import pkgBot from '@builderbot/bot';
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { MemoryDB as Database } from '@builderbot/bot'
import { fetchArticlesConcurrently, processArticles } from './articulos.js';
import { flowInactividad, startInactividad, resetInactividad, stopInactividad,
} from "./idle.js";
const { EVENTS, createBot, createProvider, createFlow, addKeyword } = pkgBot;

// Inicializar la aplicación de Firebase
const PORT = 3000
const database = getFirestore(); // Usa firebaseApp

const cantidad = 3;



const guardarArticulosEnFirebase = async (articulos) => {
    const batch = [];
    for (const articulo of articulos) {
        const articuloRef = doc(database, 'articulos', articulo.indice.toString());
        batch.push(setDoc(articuloRef, articulo));
    }
    await Promise.all(batch);
    console.log('Artículos actualizados en Firebase.');
};
// Función para verificar el usuario
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
        await Promise.all(batch);

        return nuevoUsuario;
    } catch (error) {
        console.error('Error en verificarUsuario:', error);
        return null;
    }
};

// Función para actualizar el ranking
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

// Función para agregar página visitada
const agregarPaginaVisitada = async (numeroTelefono, url, id) => {
    try {
        const resultado = await getDocs(collection(database, 'usuarios'));
        for (let docSnap of resultado.docs) {
            let usuario = docSnap.data();
            if (usuario.numeroWhatsapp === numeroTelefono) {
                const usuarioRef = doc(database, 'usuarios', usuario.numeroWhatsapp);
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

// Función para actualizar el usuario
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

// Función para agregar números aleatorios
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
const ejecutarScrapingDiario = async () => {
    try {
        console.log('Iniciando scraping manual...');
        const articles = await fetchArticlesConcurrently();
        const processedArticles = await processArticles(articles);
        await guardarArticulosEnFirebase(processedArticles);
    } catch (error) {
        console.error('Error durante el scraping manual:', error);
    }
};

const obtenerArticulosDesdeFirebase = async () => {
    const articlesRef = collection(database, 'articulos');
    const articlesSnap = await getDocs(articlesRef);

    const articles = [];
    articlesSnap.forEach(doc => {
        articles.push(doc.data());
    });

    return articles;
};
cron.schedule('0 3 * * *', async () => {
    await ejecutarScrapingDiario();
});
const main = async () => {
        const scraping = await ejecutarScrapingDiario();
        const textoPagina= await obtenerArticulosDesdeFirebase();
        let art = 1;
        let user;
        const arregloAleatorio = [];
        const indicesUsados = [];

        for (let index = 0; index < cantidad; index++) {
            let numeroEnteroAleatorio;
        
            do {
                numeroEnteroAleatorio = Math.floor(Math.random() * textoPagina.length);
            } while (indicesUsados.includes(numeroEnteroAleatorio));
            
            indicesUsados.push(numeroEnteroAleatorio);
            arregloAleatorio.push(textoPagina[numeroEnteroAleatorio]);
        }

        // Flujo de despedida
        const flowDespedida = addKeyword(['chao', 'CHAO', 'Chao', 'adios', 'Contactar', 'contactar', 'Contactar'], { sensitive: true })
            .addAction(async (ctx, { flowDynamic, endFlow }) => {
                // Iniciar el temporizador de inactividad
                resetInactividad(ctx, endFlow, 180000); // 1 minuto para el temporizador

                await flowDynamic([
                    {
                        body: 'Gracias por haber sostenido esta conversación. Recuerda, soy Lara la divulgadora de innovaciones de la UACh'
                    },
                    {
                        body: 'Puedes escribirme a oficina.otl@uach.cl o seguirme en instagram https://www.instagram.com/otl_uach/'
                    },
                    {
                        body: 'Comparte mi contacto con esta imagen, o con el siguiente link \nhttps://wa.me/qr/URVPLRVME6GNM1',
                        media: 'imgs/laraqr.jpg'
                    }
                ]);
            });

        // Flujo terciario
        const flowTerciario = addKeyword('3', { sensitive: true })
            .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
                // Iniciar el temporizador de inactividad
                resetInactividad(ctx, endFlow, 180000); // 1 minuto para el temporizador
                const myState = state.getMyState();
                await flowDynamic(`más información: ${textoPagina[myState.i - 1].fragmentoLink}\n\nEstamos muy agradecidos de esta conversación contigo. Te proponemos seguir conociendo un poco más sobre innovaciones? \nDigita *Reset* para que te comparta otras tres iniciativas\n\nSi te interesa ser contactado en las próximas horas por una persona de la Dirección de Innovación UACh, digita *Contactar*`);
            });

        // Flujo académico
        const flowAcademico = addKeyword('2', { sensitive: true })
            .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
                try {
                    const myState = state.getMyState();
                    const e = textoPagina[myState.i - 1];
                    let imagen = e.imgSrc;

                    await flowDynamic([{
                        body: `${e.indice} - *${e.fragmentoTitulo}* \n El investigador responsable de este proyecto es *${e.headingText}*`,
                        media: imagen
                    }]);
                } catch (error) {
                    console.error('Error en flowAcademico:', error);
                }
            })
            .addAction(async (ctx, { flowDynamic, endFlow }) => {
                // Iniciar el temporizador de inactividad
                resetInactividad(ctx, endFlow, 180000); // 1 minuto para el temporizador

                await flowDynamic([
                    { body: 'Excelente ¿Quieres seguir conociendo un poco más sobre esta innovación? Digita *3* \n\n¿Quieres explorar información sobre otras innovaciones? Digita *Reset*' }
                ]);
            });

        // Flujo secundario
        const flowSecundario = addKeyword('1', { sensitive: true })
            .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
                const myState = state.getMyState();
                await flowDynamic(`${textoPagina[myState.i - 1].indice} - *${textoPagina[myState.i - 1].fragmentoTitulo}*\n\n${textoPagina[myState.i - 1].solutionText}`);
            })
            .addAction(async (ctx, { flowDynamic, endFlow }) => {
                // Iniciar el temporizador de inactividad
                resetInactividad(ctx, endFlow, 180000); // 1 minuto para el temporizador

                await flowDynamic([
                    { body: `Muy bien, gracias por interesarte en nuestro trabajo \n¿Quieres seguir conociendo un poco más sobre esta innovación? Digita *2* \n\n¿Quieres explorar información sobre otras innovaciones? Digita *Reset*` }
                ]);
            });

        // Flujo para enviar array
        const flowEnviarArray = addKeyword('0', { sensitive: true })
            .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
                const myState = state.getMyState();
                const e = textoPagina[myState.i - 1];

                await flowDynamic([{
                    body: `${e.indice} - *${e.fragmentoTitulo}* \n${e.problematicText}`,
                    media: textoPagina[myState.i - 1].src
                }]);
            })
            .addAction(async (ctx, { flowDynamic, state, endFlow }) => {
                // Iniciar el temporizador de inactividad
                await resetInactividad(ctx, endFlow, 180000); // 1 minuto para el temporizador

                await flowDynamic([{
                    body: `Excelente, ¿Quieres seguir conociendo un poco más sobre esta innovación? Digita *1* \n\n¿Quieres explorar información sobre otras innovaciones? Digita *Reset*`,
                }]);
            }).addAction( { capture: true },
                async (ctx, { gotoFlow, state }) => {
                    return gotoFlow(flowSecundario);
                });

        // Flujo principal 2
        const flowPrincipal2 = addKeyword(["iniciar", "Iniciar", "INICIAR", "Return", "RETURN", "return"], { sensitive: true })
            .addAnswer(
                'espere un momento, se están generando artículos...',
                { delay: 1000 },
                async (ctx, { provider, flowDynamic, endFlow }) => {
                    try {
                        for (let index = 0; index < cantidad; index++) {
                            const itemIndex = user.arregloActual;
                            if (itemIndex[index] >= 0 && itemIndex[index] < textoPagina.length) {
                                const e = textoPagina[itemIndex[index]];
                                if (e && e.indice !== undefined && e.fragmentoTitulo && e.fragmentoTexto) {
                                    let bodyMessage = `${e.indice} - *${e.fragmentoTitulo}* \n${e.fragmentoTexto}`;
                                    const mediaSrc = e.src || '';
                                    try {
                                        await flowDynamic([{
                                            body: bodyMessage,
                                            media: mediaSrc
                                        }]);
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
                        console.error('Error en la construcción del mensaje en flowPrincipal2:', error.message);
                        console.error('Stack trace:', error.stack);
                    }
                }
            )
            .addAction(
                async (ctx, { flowDynamic, endFlow }) => {
                    // Iniciar el temporizador de inactividad
                    await resetInactividad(ctx, endFlow, 180000); // 1 minuto para el temporizador

                    await flowDynamic([
                        { body: 'Muy bien ' + ctx.pushName + ', ahora debes digitar el número de la innovación que quieres conocer...' }
                    ]);
                }
            )
            .addAction(
                { capture: true },
                async (ctx, { gotoFlow, state }) => {
                    if (!isNaN(ctx.body)) {
                        try {
                            await state.update({ i: parseInt(ctx.body) });
                        } catch (error) {
                            console.log(error);
                        }
                        user = await agregarPaginaVisitada(user.numeroWhatsapp, textoPagina[parseInt(ctx.body) - 1].fragmentoLink, textoPagina[parseInt(ctx.body) - 1].indice);
                        return gotoFlow(flowEnviarArray);
                    }
                }
            );

        // Flujo principal 3
        const flowPrincipal3 = addKeyword(["reset", "Reset", "RESET"], { sensitive: true })
    .addAnswer(
        'espere un momento, se están generando artículos...',
        { delay: 1000 },
        async (ctx, { provider, flowDynamic, endFlow }) => {
            try {
               
                // Generar el arreglo de números aleatorios
                const arreglo = agregarNumerosAleatorios(user.arregloActual, textoPagina.length);
                user = await actualizarUsuario(user.numeroWhatsapp, "arregloActual", arreglo);

                // Recorrer el arreglo para enviar artículos
                for (let index = 0; index < cantidad; index++) {
                    const e = textoPagina[user.arregloActual[index]];
                    const bodyMessage = `${e.indice} - *${e.fragmentoTitulo}* \n${e.fragmentoTexto}`;
                    try {
                        // Enviar mensaje con el artículo
                        await flowDynamic([{
                            body: bodyMessage,
                            media: e.src
                        }]);
                    } catch (error) {
                        console.error('Error durante la ejecución de flowDynamic:', error);
                    }
                }
            } catch (error) {
                console.error('Error general en flowPrincipal3:', error);
            }
        }
    )
    .addAction(
        async (ctx, { flowDynamic, endFlow }) => {
            try {
                // Iniciar el temporizador de inactividad
                await resetInactividad(ctx, endFlow, 180000); // 1 minuto para el temporizador

                await flowDynamic([
                    { body: 'Muy bien ' + ctx.pushName + ', ahora debes digitar el número de la innovación que quieres conocer...' }
                ]);
            } catch (error) {
                console.error('Error en el segundo addAction en flowPrincipal3:', error);
            }
        }
    )
    .addAction(
        { capture: true },
        async (ctx, { gotoFlow, state }) => {
            if (!isNaN(ctx.body)) {
                try {
                    await state.update({ i: parseInt(ctx.body) });
                    user = await agregarPaginaVisitada(user.numeroWhatsapp, textoPagina[parseInt(ctx.body) - 1].fragmentoLink, textoPagina[parseInt(ctx.body) - 1].indice);
                    return gotoFlow(flowEnviarArray);
                } catch (error) {
                    console.error('Error en la captura de datos en flowPrincipal3:', error);
                }
            }
        }
    );



        const flowPrincipal = addKeyword(EVENTS.WELCOME, { sensitive: true })
        .addAction(async (ctx, { flowDynamic, gotoFlow }) => {
            // Iniciar el temporizador de inactividad
            await startInactividad(ctx, gotoFlow, 180000); // Temporizador de 10 segundos
            // Verificamos si el usuario existe o lo creamos
            user = await verificarUsuario(ctx, textoPagina);
            // Enviamos la respuesta de bienvenida
            await flowDynamic([
                {
                    body: 'Hola ' + ctx.pushName + ', bienvenido/a, mi nombre es *Lara* y soy una *divulgadora de innovaciones* de la Universidad Austral de Chile.',
                    media: 'imgs/lara3.jpg'
                }
            ]);
        })
        .addAnswer('Quiero que sepas que hay varias iniciativas que pueden resultar valiosas para tu institución o comunidad.', { delay: 1000 })
        .addAnswer('Ingresa la palabra *Iniciar* para comenzar a dialogar sobre innovaciones', { delay: 1000 });



        
        const adapterFlow = await createFlow([flowInactividad,flowPrincipal, flowPrincipal2, flowPrincipal3, flowEnviarArray, flowSecundario, flowAcademico, flowTerciario, flowDespedida]);
        const adapterProvider =  await createProvider(Provider)
        const adapterDB = await new Database()
        

        const { httpServer } = await createBot({
            flow: adapterFlow,
            provider: adapterProvider,
            database: adapterDB,
        })
        httpServer(+PORT);
        
       
    
};

main();
