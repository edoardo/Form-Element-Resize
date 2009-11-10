if( typeof( Form ) == 'undefined' ) { Form = {}; }
if( typeof( Form.Element ) == 'undefined' ) { Form.Element = {}; }

// class constructor
Form.Element.Resize = function( oProps )
{
    // class properties
    this.props = {};

    // defaults
    this.props.elementId = null; // mandatory!
    this.props.startX = 0;
    this.props.startY = 0;
    this.props.stopResize = 1;
    this.props.resizeType = 'auto';

    // directions/corners resize activation flags
    this.props.resizeFlags = {
        n: 0,
        ne: 0,
        e: 0,
        se: 0,
        s: 0,
        sw: 0,
        w: 0,
        nw: 0
    };

    // overwrite properties with user defined ones
    for( var cProp in this.props )
    {
        if( oProps[cProp] != undefined )
        {
            this.props[cProp] = oProps[cProp];
        }
    }

    // DOM stuff
    this.dom = {};

    this._init();
}

// version
Form.Element.Resize.VERSION = '0.01';

// class methods
Form.Element.Resize.prototype = {

// _init: generates the table and puts the element in the middle cell
_init: function()
{
    var oFER = this;

    // element object
    var oElement = document.getElementById( this.props.elementId );

    var oElementCloned = oElement.cloneNode(true);

    this.dom.elementEl = oElementCloned;

    // set resize flags
    switch( this.props.resizeType )
    {
        // automatic depending on field type
        case 'auto':

            if( oElementCloned.type == 'text' || oElementCloned.type == 'select-one' )
            {
                this.props.resizeFlags['e'] = 1;
            }
            else if( oElementCloned.type == 'textarea' || oElementCloned.type == 'select-multiple' )
            {
                with( this.props.resizeFlags )
                {
                    e = 1;
                    se = 1;
                    s = 1;
                }
            }

            break;

        case 'horizontal':

            this.props.resizeFlags['e'] = 1;

            break;

        case 'vertical':

            this.props.resizeFlags['s'] = 1;

            break;

        default:

            var oCustomFlags = this.props.resizeType;

            if( typeof( oCustomFlags ) == 'object' )
            {
                for( var cFlag in this.props.resizeFlags )
                {
                    if( oCustomFlags[cFlag] != undefined )
                    {
                        this.props.resizeFlags[cFlag] = oCustomFlags[cFlag];
                    }
                }
            }
    }

    // original dimensions
    this.dom.elementOriginalWidth = oElement.offsetWidth;
    this.dom.elementOriginalHeight = oElement.offsetHeight;

    // event handling
    // double click inside the element restores its original dimensions
    this._addEvent(
        oElementCloned,
        'dblclick',
        function() { oFER._reset(); }
    );

    // mouse move while left button is pressed resizes the element
    // if shift key is pressed the resize is proportional (x = y)
    this._addEvent(
        document,
        'mousemove',
        function( e ) { oFER._resize( e ); }
    );

    // mouse up stop resize
    this._addEvent(
        document,
        'mouseup',
        function() { oFER.props.stopResize = 1; }
    );

    // create the <table> container element
    var oElementContainer = document.createElement( 'table' );
    var oTbody = document.createElement( 'tbody' ); // hack for Internet Exploder, without this the table will not be shown

    var aCursors = [
        [ 'nw','n','ne' ],
        [ 'w',null,'e' ],
        [ 'sw','s','se' ]
    ];

    for( var r = 0; r < 3; r++ )
    {
        var oTr = document.createElement( 'tr' );

        for( var c = 0; c < 3; c++ )
        {
            var oTd = document.createElement( 'td' );
            
            var cResizeType = aCursors[r][c];

            if( this.props.resizeFlags[cResizeType] )
            {
                oTd.className = cResizeType;
                oTd.style.cursor = cResizeType + '-resize';

                this._addEvent(
                    oTd,
                    'mousedown',
                    function( e ) { oFER._storeStartCoords( e ); }
                );
            }

            if( r == 1 && c == 1 )
            {
                oTd.appendChild( oElementCloned );
            }

            oTr.appendChild( oTd );
        }

        oTbody.appendChild( oTr );
    }

    oElementContainer.appendChild( oTbody );

    this.dom.containerEl = oElementContainer;

    oElement.parentNode.replaceChild( oElementContainer, oElement );
},

// _storeStartCoords: called when the mousedown event is fired on a border/corner stores the coordinates of the mouse pointer
_storeStartCoords: function( e )
{
    if( ! e && window.event )
    {
        e = window.event;
    }

    this.props.startX = e.clientX;
    this.props.startY = e.clientY;

    // store also original dimensions if not initialized
    // (it seems that in the _init() the offsetWidth / offsetHeight are 0, maybe because the document is not fully loaded?!)
    if( ! this.dom.elementOriginalWidth || ! this.dom.elementOriginalHeight )
    {
        this.dom.elementOriginalWidth = this.dom.elementEl.offsetWidth;
        this.dom.elementOriginalHeight = this.dom.elementEl.offsetHeight;
    }

    this.dom.elementCurrentWidth = this.dom.elementEl.offsetWidth;
    this.dom.elementCurrentHeight = this.dom.elementEl.offsetHeight;

    var oTd = ( e.target ) ? e.target
                           : ( e.srcElement ) ? e.srcElement
                                              : undefined;

    // this is for a Safari bug (see w3cschools)
    if( oTd && oTd.type == 3 )
    {
        oTd = oTd.parentNode;
    }

    this.props.currentResizeType = oTd.className;
    this.props.stopResize = 0;
},

// _resize: called when the mouse is moved, reads the pointer position and resizes the table and element dimensions depending on the start coordinates
_resize: function( e )
{
    // left mouse button must be pressed!
    if( this.props.stopResize ) { return true; }

    if( ! e && window.event )
    {
        e = window.event;
    }

    var lVResize = ( this.props.currentResizeType.match( /[n|s]/ ) ) ? 1 : 0;
    var lHResize = ( this.props.currentResizeType.match( /[e|w]/ ) ) ? 1 : 0;

    var nWidth = this.dom.elementCurrentWidth + ( e.clientX - this.props.startX );

    // proportional resize with SHIFT key pressed and both horizontal and vertical resize requested
    var nHeight = ( e.shiftKey && lVResize && lHResize )
                ? nWidth
                : this.dom.elementCurrentHeight + ( e.clientY - this.props.startY );

    with( this.dom.containerEl.style )
    {
        if( lHResize && nWidth > 0 ) { width = nWidth + 'px'; }
        if( lVResize && nHeight > 0 ) { height = nHeight + 'px'; }
    }

    with( this.dom.elementEl.style )
    {
        if( lHResize && nWidth > 0 ) { width = nWidth + 'px'; }
        if( lVResize && nHeight > 0 ) { height = nHeight + 'px'; }
    }
},

// _reset: called when a double click event is fired, restores the original dimensions of the element
_reset: function()
{
    if( ! this.dom.elementOriginalWidth && ! this.dom.elementOriginalHeight ) { return true; }

    with( this.dom.containerEl.style )
    {
        width = this.dom.elementOriginalWidth + 'px';
        height = this.dom.elementOriginalHeight + 'px';
    }

    with( this.dom.elementEl.style )
    {

        width = this.dom.elementOriginalWidth + 'px';
        height = this.dom.elementOriginalHeight + 'px';
    }
},

// _addEvent: cross-browser event handler
_addEvent: function( oObj, cEvent, rFunction )
{
    if( oObj.addEventListener )
    {
        oObj.addEventListener( cEvent, rFunction, false );
        return true;
    }
    else if( oObj.attachEvent )
    {
        return oObj.attachEvent( 'on' + cEvent, rFunction );
    }
    else
    {
        return false;
    }
}

};

/*

=head1 NAME

Form.Element.Resize - Unobtrusive javascript class for make a standard form field resizable with the mouse

=head1 SYNOPSIS

 <!-- XHTML page -->
 <form action="http://host.domain.tld/cgi-bin/script">
  <label for="message">Message:</label><br />
  <textarea id="message" name="message"></textarea>
 </form>

 // javascript code
 new Form.Element.Resize({ elementId: 'message' });

=head1 DESCRIPTION

This nice class implement some methods for add a mouse-driven resize feature on form fields such as text inputs, textareas and select controls.
Clicking and dragging the borders or the corners of the form element will resize it while double clicking inside the element will restore its
original dimensions (this does not work with select elements in Internet Explorer and Firefox).

Tested under Firefox 2, Internet Explorer 6/7, Opera 9.

=head1 METHODS

=head2 B<new()>

Class constructor, returns a new Form.Element.Resize object.

=head3 Parameters

=over 3

=item B<oProps>

Object literal where must be specified the element id on which activate the resize feature and other optional properties that overwrites the defaults.

Properties are:

=over 3

=item C<elementId>

ID of the element on which enable the resize feature. B<mandatory!>

=item C<resizeType>

Type of resize, shortcuts are auto, horizontal and vertical (default is auto).

- auto: resizable borders and corners are set automatically depending on the form element type.
  text input and non-multiple select have only the right border draggable;
  textarea and multple select have the right and bottom borders and the bottom-right corner draggable.

- horizontal: all field types have only the right border draggable.

- vertical: all field types have only the bottom border draggable.

It is also possible to specify each border/corner to activate by passing an object literal with one or more of the following keys:

n, ne, e, se, s, sw, w, nw

All are initially disabled, so for example, to activate only the bottom-right corner the property must be initialized like this:

 new Form.Element.Resize({ elementId: 'message', resizeType: { se: 1 } });

=back

=back

=head1 EXAMPLES

 <!-- you can initialize the class within your XHTML page like this -->
 <form action="http://host.domain.tld/cgi-bin/script">
  <label for="message">Message:</label><br />
  <textarea id="message" name="message"></textarea>
  <script type="text/javascript">new Form.Element.Resize({ elementId: 'message' });</script>
 </form>


 // or in a more unobtrusive way put the new in an included javascript file.
 // be sure to call the new when the page is loaded!
 // a cross-browser way may be this
 if( document.addEventListener )
 {
     document.addEventListener(
       'load',
       function() { new Form.Element.Resize({ elementId: 'message' }); },
       false
     );

     return true;
 }
 else if( document.attachEvent )
 {
     return document.attachEvent(
       'onload',
       function() { new Form.Element.Resize({ elementId: 'message' }); }
     );
 }

=head1 SEE ALSO

Official web page at L<http://www.sabadelli.it/edoardo/projects/javascript/form.element.resize>

JSAN L<http://openjsan.org/>

=head1 AUTHOR

Edoardo Sabadelli - L<http://www.sabadelli.it/edoardo>

=head1 COPYRIGHT

Copyright (c) 2007 Edoardo Sabadelli. All rights reserved.

This module is free software; you can redistribute it and/or modify it
under the terms of the Artistic license.

=cut

*/