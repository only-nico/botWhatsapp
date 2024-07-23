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
    const url = 'https://otl.uach.cl/casos-de-exito/?_categories=caso-exito';
    const document = await fetchAndParseHTML(url);

    if (document) {
        const elements = document.querySelectorAll('div[data-elementor-type="loop-item"]');
        elements.forEach((element) => {
            articles.push(element.outerHTML);
        });
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
            const imgWidget = document.querySelector('div.elementor-column.elementor-col-33.elementor-top-column.elementor-element');
            // Asegúrate de que imgWidget no sea null antes de usar querySelector

            const imgSrc = imgWidget ? imgWidget.getAttribute('src') : 'No se encontró src';
            
            // Selecciona el div que contiene el texto del encabezado
            const headingWidget = document.querySelector('div.elementor-widget.elementor-widget-heading div.elementor-heading-title');
            const headingText = headingWidget ? headingWidget.textContent.trim() : 'No se encontró encabezado';

            // Retorna los valores obtenidos
            return { headingText, imgSrc };
        }

        // Retorna valores por defecto si el documento no se pudo obtener
        return { headingText: 'No se encontró encabezado', imgSrc: 'No se encontró src' };
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
        let { imageSrc, headingText } = fragmentoLink ? await fetchImageSrcAndHeadingText(fragmentoLink) : { imageSrc: '', headingText: '' };
        if(videoLink==""){
            videoLink=fragmentoLink;
        }
        if (imageSrc === undefined || imageSrc === '') {
            imageSrc = src; // Reemplaza 'default-src' con el valor que desees asignar
        }
        if (fragmentoTitulo && fragmentoLink && fragmentoTexto && src && !src.endsWith('.webp')) {
            pageTexts.push({
                fragmentoTitulo,
                fragmentoTexto,
                fragmentoLink,
                problematicText,
                solutionText,
                headingText,
                videoLink,
                src,
                imageSrc,
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



                