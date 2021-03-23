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

gulp.task('copy', function () {
    return gulp.src([
        'src/assets/**',
        'src/libs/**',
        'src/**/*.html',
        'src/contentscript.js',
        'src/manifest.json'
    ], {base: 'src'})
        .pipe(gulp.dest('build'));
});

gulp.task('minify-css', function () {
    return gulp.src('src/css/**/*.css')
        .pipe(concatCss('main.css'))
        .pipe(cssmin())
        .pipe(gulp.dest('build/css'));
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
        .pipe(gulp.dest('build'));
});

gulp.task('build', gulp.series('clean', 'copy', 'minify-css', 'popup-html'));

gulp.task('default', gulp.series('clean', 'build'));