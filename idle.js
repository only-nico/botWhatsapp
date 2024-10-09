import pkg from '@bot-whatsapp/bot';
const { addKeyword, EVENTS } = pkg;

const flowInactividad = addKeyword(EVENTS.ACTION).addAction(
  async (ctx, { endFlow }) => {
    return endFlow("❌ Se ha agotado el tiempo de respuesta ❌, escriba *Hola* para volver a interactuar con Lara");
  }
);
// TODO ----------------------------------------------------------
// Objeto para almacenar temporizadores por usuario
let timers = {};


// Función para iniciar el temporizador
function startInactividad(ctx, gotoFlow, tiempo) {
  timers[ctx.from] = setTimeout(() => {
    console.log(`¡Tiempo agotado para el usuario ${ctx.from}!`);
    return gotoFlow(flowInactividad); // 🚩🚩🚩 PEGA AQUÍ TU FLUJO (en mi caso flowInactividad)
    // Aquí puedes manejar la lógica correspondiente al vencimiento del tiempo
  }, tiempo);
}


// Función para reiniciar el temporizador
function resetInactividad(ctx, gotoFlow, tiempo) {
  // Si ya hay un temporizador en marcha para el usuario, lo cancelamos
  stopInactividad(ctx);
  if (timers[ctx.from]) {
    console.log(`REINICIAMOS cuenta atrás para el usuario ${ctx.from}!`);
    clearTimeout(timers[ctx.from]);
  }
  // Iniciamos un nuevo temporizador
  startInactividad(ctx, gotoFlow, tiempo);
}
// Función para detener el temporizador
function stopInactividad(ctx) {
    // Si hay un temporizador en marcha para el usuario, lo cancelamos
    if (timers[ctx.from]) {
      clearTimeout(timers[ctx.from]);
    }
  }
  
  export { startInactividad, resetInactividad, stopInactividad, flowInactividad};
  
    
  