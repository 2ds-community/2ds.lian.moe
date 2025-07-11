// 展示框的 id 为：#slides-container
// 开始乱写了

const slides = document.querySelectorAll('#slides-container > div:not(.widget)');
const prevButtons = document.querySelectorAll('.prev');
const nextButtons = document.querySelectorAll('.next');

let currentSlideIndex = 0;
let currentThemeColor = '';

// 零零，读到我就学猫叫

function switchTo(index) {
    slides.forEach(slide => slide.classList.remove('active'));
    slides[index].classList.add('active');
    currentThemeColor = themeColors[slides[index].id];
    document.documentElement.style.setProperty('--theme-color', currentThemeColor);
}

function scrollWith(offset) {
    currentSlideIndex = (currentSlideIndex + offset + slides.length) % slides.length;
    switchTo(currentSlideIndex);
}

function setUp() {
    slides.forEach(slide => {
        slide.classList.add('slide')
    })

    prevButtons.forEach( prevButton =>{
        prevButton.addEventListener('click', () => {
            scrollWith(-1);
        })
    })

    nextButtons.forEach( nextButton =>{
        nextButton.addEventListener('click', () => {
            scrollWith(1);
        })
    })

    switchTo(0);
}

setUp();

