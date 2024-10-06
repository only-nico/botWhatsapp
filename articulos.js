import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

// Función para obtener y parsear HTML desde una URL
const fetchAndParseHTML = async (url) => {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // Liberar JSDOM para reducir consumo de memoria
        dom.window.close();
        return document; 
    } catch (error) {
        console.error('Error fetching and parsing HTML:', error);
        return null;
    }
};

// Función para obtener artículos desde una URL con limitación de solicitudes simultáneas
const fetchArticlesConcurrently = async (concurrencyLimit = 3) => {
    const articles = [];
    let page = 1;
    const maxPages = 10; 
    const baseURL = 'https://otl.uach.cl/casos-de-exito/?_categories=caso-exito&_paged=';

    // Función para procesar una página
    const processPage = async (page) => {
        const url = `${baseURL}${page}`;
        const document = await fetchAndParseHTML(url);

        if (document) {
            let elements = document.querySelectorAll('div[data-elementor-type="loop-item"]');
            elements.forEach((element) => {
                articles.push(element.outerHTML);
            });

            // Liberar memoria
            elements = null;
        }
    };

    const queue = [];
    while (page <= maxPages) {
        if (queue.length >= concurrencyLimit) {
            await Promise.race(queue); // Esperar a que se libere un slot
        }

        const promise = processPage(page);
        queue.push(promise);
        promise.finally(() => {
            const index = queue.indexOf(promise);
            if (index > -1) queue.splice(index, 1); // Eliminar la promesa resuelta del array
        });

        page++;
    }

    await Promise.all(queue); // Esperar a que todas las promesas se resuelvan

    return articles;
};

// Optimización: Función para limpiar el texto
const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

// Optimización: Evitar almacenar JSDOM innecesariamente
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
        
        if (videoLink === "") videoLink = fragmentoLink;
        if (imgSrc === '') imgSrc = src;

        // Almacenar solo los elementos necesarios
        if (fragmentoTitulo && fragmentoLink && fragmentoTexto && src) {
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

        // Cerrar JSDOM y liberar memoria
        document.defaultView.close();
    }
    return pageTexts;
};

export { fetchArticlesConcurrently, processArticles };
