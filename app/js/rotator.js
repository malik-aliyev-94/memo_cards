(function ( $ ) {
 
  function calc(c) {

    var cards = $(c).find('.cards-rotator-container > *');
    var container = $(c).find('.cards-rotator-container');
    var wrapper = $(c).find('.cards-rotator-wrapper');

    cards.each(function(){
      var index = $(this).index();
      $(this).css({
        "top": -index*5+'%',
        "bottom": index*5+'%',
        "transform": "rotate(0) translate(0, 0) scale("+(1-index/15)+")",
        "z-index": (cards.length+1)-index,
        "opacity": 1,
        "position": "absolute",
        "width": "100%",
        "height": "100%",
        "box-sizing": "border-box",
        "transition": "all .3s ease",
      });
    });

    wrapper.css({
      "padding-top": cards.length+"%"
    });
  }

  function next(c, callback) {
    var cards = $(c).find('.cards-rotator-container > *');
    var card = cards.first();
    var container = $(c).find('.cards-rotator-container');
    var wrapper = $(c).find('cards-rotator-wrapper');

    card.css({
      transform: 'rotate(40deg) translate('+ 0.45*card.width() +'px, -'+ 1.45*card.height() +'px) scale(1)',
    });

    setTimeout(function(){
      card.appendTo(container);
      setTimeout(function(){
        calc(c);
        if ( callback ) {
          setTimeout(function(){
            callback();
          }, 300);
        }
      }, 100);
    }, 300);
  }

  $.fn.cardsRotator = function(options) {
      // $(this).each(function(){
      $(this).append('<div class="cards-rotator-wrapper"  style="width:'+options.width+'">'
                      +'<div class="cards-rotator-container"  style="position: relative; width:'+options.width+';height:'+options.height+'"></div>'
                    +'</div>');
      var wrapper = $(this).find('.cards-rotator-wrapper');
      var container = $(this).find('.cards-rotator-container');
      $(this).children().not('.cards-rotator-wrapper').css({
        "position": "absolute",
        "width": "100%",
        "height": "100%",
        "box-sizing": "border-box",
        "transition": "all .3s ease",
      }).appendTo(container);
      calc(this);

      // });
      var self = this;
      return {
        calc: function() {
          calc(self);
        },
        next: function(callback) {
          next(self, callback);
        }
      }
  };

}( jQuery ));
