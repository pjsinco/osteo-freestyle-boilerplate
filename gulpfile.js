var gulp = require('gulp');
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync').create();
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var plumber = require('gulp-plumber');
var notify = require('gulp-notify');
var imagemin = require('gulp-imagemin');
var concat = require('gulp-concat');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var replace = require('gulp-replace');
var nunjucksRender = require('gulp-nunjucks-render');
var data = require('gulp-data');
var newer = require('gulp-newer');
//var svgmin = require('gulp-svgmin');
var fs = require('fs');
var htmlmin = require('gulp-htmlmin');
var cleanCss = require('gulp-clean-css');

function onError(error) {
  this.emit('end');
}

const imgSrc = 'src/images/**'
const imgDest = 'dist/images'

/**
 * https://stackoverflow.com/questions/28787457/
 *         how-can-i-set-an-environment-variable-as-gulp-task
 */
gulp.task('set-dev-env', function() {
  return process.env.NODE_ENV = 'development';
});

gulp.task('set-prod-env', function() {
  return process.env.NODE_ENV = 'production';
});

gulp.task('templates', function() {
  return gulp.src(['./src/pages/**/*.+(nunjucks|svg)'])
//    .pipe(data(function(json) {
//      // Maybe we can find something useful to do here
//      return JSON.parse(fs.readFileSync('./data.json'));
//    }))
    .pipe(nunjucksRender({
      path: ['./src/templates']
    }))
    .pipe(gulp.dest('.'))
    .pipe(notify({ message: 'Rendered template!' }))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('images', function() {
  console.log('Processing images ...');
  return gulp.src(imgSrc)
    .pipe(newer(imgDest))    
    .pipe(imagemin())
    .pipe(gulp.dest(imgDest))
    .pipe(notify({ message: 'Imagemin\'d!' }))
    .pipe(browserSync.reload({ stream: true }));
})

//gulp.task('svgmin', function() {
//  return gulp.src(['./src/svgs/**'])
//    .pipe(svgmin())
//    .pipe(gulp.dest(imgDest))
//    .pipe(notify({ message: 'SVGMin\'d!' }));
//});

gulp.task('scripts', function() {
  var b = browserify({
      entries: './src/scripts/main.js',
      debug: true,
  });

  return b.transform('babelify', { presets: ['env'] })
    .bundle()
    .on('error', notify.onError({
        message: 'Error: <%= error.message %>',
        sound: 'Pop'
    }))
    .pipe(source('main.js'))
    .pipe(rename('bundle.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/'))
    .pipe(notify({ message: 'Browserified!' }))
    .pipe(browserSync.reload({ stream: true }));
})

gulp.task('bundle', ['scripts'], function() {
  return gulp.src([
    'dist/bundle.js'
  ]).pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('sass', function() {
  return gulp.src('src/styles/**/*.scss')
    .pipe(plumber({ errorHandler: onError }))
    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemaps.write())
    .pipe(rename('styles.css'))
    .pipe(autoprefixer({
      browsers: [
        'last 2 versions',
        'android 4',
        'opera 12'
      ]
    }))
    .pipe(gulp.dest('dist'))
    .pipe(notify({ message: 'Sassed!' }))
    .pipe(browserSync.reload({ stream: true }));
});

gulp.task('copy-and-replace-css', function() {
  return gulp.src(['dist/styles.css'])
    .pipe(replace('images/', '/wp-content/uploads/'))
    .pipe(gulp.dest('togo'));
});

gulp.task('minify-css', function() {
  return gulp.src('togo/styles.css')
    .pipe(cleanCss({ debug: true }, function(details) {
       console.log(`${details.name}: ${details.stats.originalSize}`);
       console.log(`${details.name}: ${details.stats.minifiedSize}`);
    }))
    .pipe(gulp.dest('togo'));
});

gulp.task('build-for-prod', ['set-prod-env', 'copy-and-replace-css'], function() {
  return gulp.src(['index.html'])
    .pipe(replace('dist/images', '/wp-content/uploads'))
    //.pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest('togo/'))
})

gulp.task('watch', function() {
  browserSync.init({
    server: {
      baseDir: './',
    },
  });

  gulp.watch('src/styles/**/*.scss', ['sass']);
  gulp.watch('src/scripts/**/*.js', ['scripts', 'bundle']);
  gulp.watch(imgSrc, ['images']);
  gulp.watch('src/pages/**/*.+(nunjucks|svg)', ['templates']);
  gulp.watch('src/templates/**/*.nunjucks', ['templates']);
  //gulp.watch('./src/svgs/**/*.svg', ['svgmin']);
  gulp.watch('index.html').on('change', browserSync.reload);
})

gulp.task('default', ['watch']);
