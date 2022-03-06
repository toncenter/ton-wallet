var gulp = require('gulp'),
    cssmin = require('gulp-cssmin'),
    del = require('del'),
    deleteLines = require('gulp-delete-lines'),
    concatCss = require('gulp-concat-css');
var rename = require('gulp-rename');
var replace = require('gulp-replace');

gulp.task('clean', function () {
    return del(['build']);
});

gulp.task('clean-firefox', function () {
    return del(['build-firefox']);
});

gulp.task('copy', function () {
    return gulp.src([
        'src/assets/**',
        'src/libs/**',
        'src/**/*.html'
    ], {base: 'src'})
        .pipe(gulp.dest('build'))
        .pipe(gulp.dest('build-firefox'));
});

gulp.task('copy-chrome', function () {
    return gulp.src([
        'src/js/extension/*',
        'src/manifest.json'
    ], {base: 'src'})
        .pipe(gulp.dest('build'));
});

gulp.task('copy-firefox', function () {
    return gulp.src([
        'src/firefox/contentscript.js',
        'src/firefox/manifest.json',
    ], {base: 'src/firefox'})
        .pipe(gulp.dest('build-firefox/'));
});

gulp.task('minify-css', function () {
    return gulp.src('src/css/**/*.css')
        .pipe(concatCss('main.css'))
        .pipe(cssmin())
        .pipe(gulp.dest('build/css'))
        .pipe(gulp.dest('build-firefox/css'));
});

gulp.task('popup-html', function () {
    return gulp.src('src/index.html')
        .pipe(replace('<body>', '<body class="plugin">'))
        .pipe(deleteLines({
            'filters': [
                /Controller.js/i
            ]
        }))
        .pipe(rename('popup.html'))
        .pipe(gulp.dest('build'))
        .pipe(gulp.dest('build-firefox'));
});

gulp.task('build', gulp.series('clean', 'clean-firefox', 'copy', 'copy-chrome', 'copy-firefox', 'minify-css', 'popup-html'));

gulp.task('default', gulp.series('clean', 'clean-firefox', 'build'));