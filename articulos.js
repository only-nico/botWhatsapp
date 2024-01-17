// articulos.js
const { JSDOM } = require('jsdom');
const fetchArticles = async () => {
    const arregloArticulos = [];
    let page = 1;

    try {
        while (page <= 10) {
            let htmlString = await fetch(`https://encuentro.migracionescomunicativas.cl/wp-json/wp/v2/posts/?paged=${page}`)
                .then(response => response.text());

            const { window } = new JSDOM(htmlString);
            const doc = window.document;
            const articulos = doc.querySelector('.ast-row').querySelectorAll('article');

            articulos.forEach(articulo => {
                arregloArticulos.push(articulo.innerHTML);
            });

            page++;
        }
    } catch (error) {
        console.error('Error al obtener el HTML:', error);
    }

    return arregloArticulos;
};

const processArticles = (arregloArticulos) => {
    const textoPagina = [];

    for (const elem of arregloArticulos) {
        const { document } = new JSDOM(elem).window;

        // Selecciona el fragmento de texto que deseas
        const fragmentoTexto = document.querySelector('.entry-content p')?.textContent || '';
        
        // Selecciona el enlace dentro de la entrada del encabezado
        const entryHeaderLink = document.querySelector('.entry-header a');

        // Verifica si el enlace existe antes de intentar acceder a su atributo href
        const fragmentoLink = entryHeaderLink ? entryHeaderLink.getAttribute('href')  : null;
        
        // Selecciona el elemento img dentro de la clase post-thumb-img-content
        const imgElement = document ? document.querySelector('.post-thumb-img-content img') : null;

        // Verifica si el elemento img existe antes de intentar acceder al atributo src
        const src = imgElement ? imgElement.getAttribute('src') : null;

        // Imprime el fragmento de texto y el atributo src (si existe)
        textoPagina.push({
            fragmentoTexto,
            fragmentoLink,
            src,
        });
    }

    return textoPagina;
};


module.exports = { fetchArticles, processArticles };
