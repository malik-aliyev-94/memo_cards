$(function(){
  var state = {
    viewed: []
  };
  var loading = '<div class="loading"><img src="/images/loading.gif" alt="" /></div>';
  var done = '<div class="done"><img src="/images/done.gif" alt="" /></div>';

  function fetch() {
    $('#train-actions').hide();
    $('#modal1 .vocabulary-data').html('');
    var c = $('#rotator .flip-container').eq(0);
    c.html('<div class="flipper"><div class="flex card">'+loading+'<p>Loading...</p></div></div>');
    $.get('/random', {except: JSON.stringify(state.viewed)}, function(res){
      if ( res.empty ) {
        if ( state.viewed.length ) {
          state.viewed = [];
          fetch();
        } else {
          $('#rotator .flip-container').not(':first').remove();
          c.html('<div class="flipper"><div class="flex card">'+done+'<p>Learning completed.</p></div></div>');
        }
      } else {
        var data = res.data;
        state.viewed.push(data.id);
        var block = 
        '<div class="flip-container'+(data.flip ? ' hover' : '')+'" data-id="'+data.id+'">'+
          '<div class="flipper">'+
            '<div class="front card">'+
              '<span class="source">'+data.source+'</span>'+
              '<span class="translit">['+data.translit+']</span>'+
            '</div>'+
            '<div class="back card">'+
              '<span class="translation">'+data.translation+'</span>'+
            '</div>'+
          '</div>'+
        '</div>';

        setTimeout(function(){
          c.replaceWith(block);
          $('#rotator .flip-container').eq(1).html('<div class="flipper"><div class="flex card">'+loading+'<p>Loading...</p></div></div>');
          rotator.calc();
        }, 500);
        
        $('#modal1 .vocabulary-data').html(data.examples);
        $('#modal1 .modal-footer a').first().attr('data-id', data.id);
        $('#train-actions').show();
        if (data.count < 2) {
          $('#train-actions>*').last().hide();
        } else {
          $('#train-actions>*').last().show();
        }
      }
    });
  }

  fetch();

  $(document).on('click', '.action-reload', function(){
    location.reload();
  });

  var socket = io.connect('http://localhost:4200');
  socket.on('connect', function(data) {
      socket.emit('join', 'Hello World from client');
  });

  socket.on('new-word', function(data) {
    var c = $('#new-word');
    if ( c.length ) {
      c.find('b').text(data['source']);
      c.show();
    }
  });

  $(document).ready(function(){
    $('.fixed-action-btn').floatingActionButton();
  });

  $('#table').DataTable({
    "columnDefs": [
      { "orderable": false, "targets": -1 },
      { "orderable": false, "targets": 0 }
   ],
    "pageLength": 50,
    "fnDrawCallback": function(){
        if ( $('#table_paginate span a.paginate_button').length > 1) {
            $('#table_paginate')[0].style.display = "block";
        } else {
            $('#table_paginate')[0].style.display = "none";
        }
    },
    "language": {
        "emptyTable":       "No data available in table",
        "info":             "",
        "infoEmpty":        "",
        "infoFiltered":     "",
        "infoPostFix":      "",
        "lengthMenu":       "",
        "loadingRecords":   "Loading...",
        "processing":       "Processing...",
        "search":           "",
        "zeroRecords":      "No matching records found",
        "paginate": {
            "first":        "First",
            "previous":     "Prev",
            "next":         "Next",
            "last":         "Last"
        },
        "aria": {
            "sortAscending":    ": activate to sort column ascending",
            "sortDescending":   ": activate to sort column descending"
        },
        "decimal":          "",
        "thousands":        ","
    }
  });

  var rotator = $('#rotator').cardsRotator({
    width: '700px',
    height: '400px'
  });

  $(document).on('click', '.flip-container', function(){
    if ($(this).find('.front').length) {
      if ( $(this).hasClass('hover') ) {
        $(this).removeClass('hover');
        $.post('/update', {
          id: $(this).attr('data-id'),
          flip: 0,
          status: 0
        });
      } else {
        $(this).addClass('hover');
        $.post('/update', {
          id: $(this).attr('data-id'),
          flip: 1,
          status: 0
        });
      }
    }
  });
  
  $('.modal').modal();
  $('.dropdown-trigger').dropdown();

  $('.show-next').click(function(e){
    e.preventDefault();
    
    rotator.next(function(){
      $('#rotator .flip-container').last().replaceWith('<div class="flip-container" data-id=""><div class="flipper"><div class="flex card"></div></div></div>');
      fetch();
      rotator.calc();
    });
  });

  $('.status-learned').click(function(e){
    e.preventDefault();
    var card = $('#rotator .flip-container').first();
    card.css({
      transition: 'all .5s ease',
      transform: 'rotate(40deg) translate('+ 0 +'px, '+ 1000 +'px) scale(1)',
      opacity: 0
    });
    setTimeout(function(){
      card.attr('style', '');
      card.removeClass('hover');
      card.appendTo('#rotator .cards-rotator-container');
      rotator.calc();
      fetch(0);
    }, 500);
    
    $.post('/update', {
      id: $('.flip-container').attr('data-id'),
      flip: $('.flip-container').hasClass('hover') ? 1 : 0,
      status: 2
    }, function(){
      // location.reload();
    });
  });

  $('.wordPage a').attr('href', '#');
  $(document).on('click', '.wordPage a', function(e){
    e.preventDefault();
  })

  $(document).on('click', '.load-from-web ', function(e){
    e.preventDefault();
    var id = $(this).attr('data-id');
    $('.vocabulary-data').html(loading);
    $.post('/scrap', {
      id: id
    }, function(res){
      $('.vocabulary-data').show().html(res);
      $('.wordPage a').attr('href', '#');
    });
  });

  $(document).on('click', '.remove-this', function(e){
    var path = $(this).attr('data-href');
    $.get(path);
    $(this).parents('tr').remove();
    e.preventDefault();
  });

  

  $('.ajax-form').on('submit', function(e){
    e.preventDefault();
    var data = $(this).serialize();
    var action = $(this).attr('action');
    $.post(action, data, function(res) {
      console.log(res);
      if (res.result) {
        M.toast({html: 'Success.', classes: 'success'});
        if ( res.id ) {
          window.location = '/edit?id='+res.id;
        }
      } else {
        M.toast({html: 'Error(s) occured.', classes: 'error'})
      }
    });
  });

  $(document).on('change', '.check-word', function(){
    var checkedWords = $('.check-word:checked');
    if ( checkedWords.length ) $('#actions').show();
    else $('#actions').hide();
  });

  $(document).on('click', '.delete-selected', function(){
    var checkedWords = $('.check-word:checked');
    var ids = [];

    checkedWords.each(function(){
      $(this).parents('tr').remove();
      ids.push( $(this).val() );
    });

    $.get('/remove-selected?ids='+ids.join(','));
    $('#actions').hide();
  });

  $(document).on('click', '.train-selected', function(){
    var checkedWords = $('.check-word:checked');
    var ids = [];

    checkedWords.each(function(){
      ids.push( $(this).val() );
    });

    $.post('/train?ids='+ids.join(','), function(res) {
      if ( res == 'success') {
        $('#actions').hide();
        window.location = '/train';
      } else {
        M.toast({html: 'Error(s) occured.', classes: 'error'})
      }
    });
    
  });

  

});