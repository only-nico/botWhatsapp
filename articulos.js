import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

// Función para obtener y parsear HTML desde una URL
const fetchAndParseHTML = async (url) => {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const dom = new JSDOM(html);
        return dom.window.document;
    } catch (error) {
        console.error('Error fetching and parsing HTML:', error);
        return null;
    }
};

// Función para obtener artículos desde una URL
const fetchArticles = async () => {
    const articles = [];
    let page = 1;
    const maxPages = 10;  // Define el número máximo de páginas a recorrer
    const baseURL = 'https://otl.uach.cl/casos-de-exito/?_categories=caso-exito&_paged=';

    try {
        while (page <= maxPages) {
            const url = `${baseURL}${page}`;  // Concatenar la URL base con el número de página
            const document = await fetchAndParseHTML(url);

            if (document) {
                const elements = document.querySelectorAll('div[data-elementor-type="loop-item"]');
                elements.forEach((element) => {
                    articles.push(element.outerHTML);
                });
            }

            page++;
        }
    } catch (error) {
        console.error('Error al obtener los artículos:', error);
    }

    return articles;
};


// Función para limpiar el texto
const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

// Función para obtener el texto y el src de la imagen de un enlace
const fetchTextAndImage = async (url, textSelector, imgSelector) => {
    const document = await fetchAndParseHTML(url);

    if (document) {
        const textElement = document.querySelector(textSelector);
        const imgElement = document.querySelector(imgSelector);

        const textContent = textElement ? cleanText(textElement.textContent) : '';
        const imageSrc = imgElement ? imgElement.getAttribute('src') : '';

        return {
            textContent,
            imageSrc
        };
    }
    return { textContent: '', imageSrc: '' };
};

// Función para obtener el texto de la problemática y solución desde una URL
const fetchProblematicAndSolutionText = async (url) => {
    const problematicText = await fetchTextAndImage(url, 'div.elementor-element.elementor-element-77fa590 .elementor-widget-container p', null);
    const solutionText = await fetchTextAndImage(url, 'div.elementor-element.elementor-element-e599cfe .elementor-widget-container p', null);
    return {
        problematicText: problematicText.textContent,
        solutionText: solutionText.textContent
    };
};

// Función para obtener el src del iframe de una URL
const fetchCanonicalLink = async (url) => {
      // Obtener el documento HTML
        const document = await fetchAndParseHTML(url);
        
        // Verificar si se ha obtenido el documento
        if (document) {
            // Seleccionar el elemento que contiene el iframe
            const iframeElement = document.querySelector('[data-id="30fa3cc"]') || '';
            
            // Seleccionar el contenedor del widget
            const iframeContainer = iframeElement ? iframeElement.querySelector('.elementor-widget-container') || '' : '';
            
            // Seleccionar el iframe
            const iframe = iframeContainer ? iframeContainer.querySelector('iframe') || '' : '';
            
            // Obtener el atributo 'src' del iframe o una cadena vacía si no se encuentra
            const src = iframe ? iframe.getAttribute('src') || '' : '';
            
            return src;
        }
        
        // Retornar una cadena vacía si no se encuentra el documento
        return '';
    };
    

// Función para obtener el src de la imagen y el texto del encabezado
const fetchImageSrcAndHeadingText = async (url) => {
    try {
        // Obtén el documento HTML desde la URL proporcionada
        const document = await fetchAndParseHTML(url);

        if (document) {
            // Selecciona el div que contiene el widget de imagen
            const imgWidget = document.querySelector('div.elementor-column.elementor-col-33.elementor-top-column.elementor-element.elementor-element-f4674ec');
            //console.log('imgWidget:', imgWidget);

            let imgSrc = 'No se encontró src';  // Valor predeterminado
            if (imgWidget) {
                const imgWidget2 = imgWidget.querySelector('div.elementor-widget-wrap.elementor-element-populated');
                //console.log('imgWidget2:', imgWidget2);

                const imgWidget3 = imgWidget2 ? imgWidget2.querySelector('div.elementor-container.elementor-column-gap-no') : null;
                //console.log('imgWidget3:', imgWidget3);

                const imgWidget4 = imgWidget3 ? imgWidget3.querySelector('div.elementor-image') : null;
                //console.log('imgWidget4:', imgWidget4);

                // Verifica que imgWidget4 no sea null y contiene el <img>
                if (imgWidget4) {
                    const imgWidget5 = imgWidget4.querySelector('img');
                    //console.log('imgWidget5:', imgWidget5);

                    // Accede al <img> dentro de imgWidget4 y obtén el atributo src
                    imgSrc = imgWidget5 ? imgWidget5.getAttribute('src') : '';
                    //console.log('Imagen src:', imgSrc);
                } else {
                    console.log('No se encontró el div del widget de imagen.');
                }
            } else {
                console.log('No se encontró imgWidget.');
            }

            // Selecciona el div que contiene el texto del encabezado
            const headingWidget = document.querySelector('div.elementor-widget.elementor-widget-heading div.elementor-heading-title');
            const headingText = headingWidget ? headingWidget.textContent.trim() : 'No se encontró encabezado';

            return { headingText, imgSrc };
        }

        // Retorna valores por defecto si el documento no se pudo obtener
        return { headingText: '', imgSrc: '' };
    } catch (error) {
        // Manejo de errores si fetchAndParseHTML falla o hay un problema con el procesamiento
        console.error('Error al obtener la imagen y el texto del encabezado:', error);
        return { headingText: 'Error', imgSrc: 'Error' };
    }
};
// Función para procesar los artículos
const processArticles = async (articles) => {
    const pageTexts = [];
    let indice = 1;

    for (const article of articles) {
        const { document } = new JSDOM(article).window;

        const fragmentoTitulo = document.querySelector('.elementor-widget-heading a')?.textContent || '';
        const fragmentoTexto = cleanText(document.querySelector('.elementor-widget-text-editor')?.textContent || '');
        const entryHeaderLink = document.querySelector('.elementor-widget-heading a');
        const fragmentoLink = entryHeaderLink ? entryHeaderLink.getAttribute('href') : null;
        const src = document.querySelector('.elementor-image img')?.getAttribute('src') || null;

        const { problematicText, solutionText } = fragmentoLink ? await fetchProblematicAndSolutionText(fragmentoLink) : { problematicText: '', solutionText: '' };
        let videoLink = fragmentoLink ? await fetchCanonicalLink(fragmentoLink) : '';
        let { headingText,imgSrc } = fragmentoLink ? await fetchImageSrcAndHeadingText(fragmentoLink) : { imgSrc: '', headingText: '' };
        if(videoLink==""){
            videoLink=fragmentoLink;
        }
        //console.log({ headingText,imgSrc });
        if (imgSrc === undefined || imgSrc === '') {
            imgSrc = src; // Reemplaza 'default-src' con el valor que desees asignar
        }
        if (fragmentoTitulo && fragmentoLink && fragmentoTexto && src ) {
            pageTexts.push({
                fragmentoTitulo,
                fragmentoTexto,
                fragmentoLink,
                problematicText,
                solutionText,
                headingText,
                videoLink,
                src,
                imgSrc,
                indice
            });
            indice += 1;
        }
    }
    console.log(pageTexts);
    return pageTexts;
};

// Función para procesar el texto de un enlace
const processText = async (link) => {
    const document = await fetchAndParseHTML(link);

    if (document) {
        const entryContentDiv = document.querySelector('.entry-content.clear');
        if (entryContentDiv) {
            const paragraphs = entryContentDiv.querySelectorAll('p');
            return Array.from(paragraphs).map(p => p.textContent.trim());
        } else {
            console.error('No se encontró el div .entry-content.clear.');
        }
    }
    return null;
};

export { fetchArticles, processArticles };



                