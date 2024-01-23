// articulos.js
const { JSDOM } = require('jsdom');
const fetchArticles = async () => {
    const arregloArticulos = [];
    let page = 1;

    try {
        while (page <= 10) {
            let htmlString = await fetch(`https://encuentro.migracionescomunicativas.cl/wp-json/wp/v2/posts/?paged=${page}`,{ timeout: 15000 })
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
    var indice = 1;
    for (const elem of arregloArticulos) {
        const { document } = new JSDOM(elem).window;

        const fragmentoTitulo = document.querySelector('.entry-header a')?.textContent || '';

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
        if (fragmentoTitulo !== null && fragmentoLink !== null && fragmentoTexto !== null && src !== null) {
            textoPagina.push({
                fragmentoTitulo,
                fragmentoTexto,
                fragmentoLink,
                src,
                indice
            });
        indice+=1;
        }
    }   
    return textoPagina;
}

const processText = async (Link) => {
    try {
        const newDocument = await fetchAndParseHTML(Link);

        if (!newDocument) {
            console.error('Error al obtener y parsear el HTML.');
            return null;
        }

        const entryContentDiv = newDocument.querySelector('.entry-content.clear');

        if (!entryContentDiv) {
            console.error('No se encontró el div .entry-content.clear.');
            return null;
        }

        // Obtener todos los elementos p dentro del div
        const paragraphs = entryContentDiv.querySelectorAll('p');

        // Verificar si hay párrafos antes de continuar
        if (!paragraphs || paragraphs.length === 0) {
            console.error('No se encontraron párrafos dentro del div.');
            return null;
        }

        // Recorrer los elementos p y obtener su texto
        const textArray = [];
        paragraphs.forEach(paragraph => {
            const texto = paragraph.textContent.trim();
            textArray.push(texto);
        });

        // Retornar el array de textos
        return textArray;
    } catch (error) {
        console.error('Error en la función processText:', error);
        return null;
    }
};

const fetchAndParseHTML = async (url) => {
    try {
        const htmlString = await fetch(url)
            .then(response => response.text());

        const { window } = new JSDOM(htmlString);
        const doc = window.document;

        return doc;
    } catch (error) {
        console.error('Error al obtener y parsear el HTML:', error);
        return null;
    }
};


module.exports = { fetchArticles, processArticles };
