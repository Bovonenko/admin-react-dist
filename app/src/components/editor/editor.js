import '../../helpers/iframeLoader.js';
import React, {Component} from "react";
import axios from "axios";
import DOMHelper from '../../helpers/dom-helper.js';

export default class Editor extends Component {
    constructor() {
        super();
        this.currentPage = "index.html";
        this.state = {
            pageList: [],
            newPageName: ''
        }
        this.createNewPage = this.createNewPage.bind(this);
    }

    componentDidMount() {
        this.init(this.currentPage);
    }

    init(page) {
        this.iframe = document.querySelector('iframe');
        this.open(page);
        this.loadPageList();
    }

    open(page) {
        this.currentPage = page;

        axios
            .get(`../${page}?rnd=${Math.random().toString().substring(2)}`)   // get html document as a string
            .then(res => DOMHelper.parseStrToDOM(res.data))  // convert str to dom structure
            .then(DOMHelper.wrapTextNodes)  // find all textNodes on the page and wrap them, returns editable document
            .then(dom => {                 
                this.virtualDom = dom;      // save clean copy
                return dom;
            })
            .then(DOMHelper.serializeDOMToString)  // converts dom back to string to post it on server
            .then(html => axios.post('./api/saveTempPage.php', {html}))  // creates new page in folder
            .then(() => this.iframe.load('../temp.html'))   // that we can open now in Iframe
            .then(() => this.enableEditing())  // enable editing the page when iframe is ready
    }

    save() {
        const newDom = this.virtualDom.cloneNode(this.virtualDom);
        DOMHelper.unwrapTextNodes(newDom);
        const html = DOMHelper.serializeDOMToString(newDom);
        axios
            .post("./api/savePage.php", {pageName: this.currentPage, html})
    }

    enableEditing() {
        this.iframe.contentDocument.body.querySelectorAll('text-editor').forEach(element => {
            element.contentEditable = 'true';     // makes text editable
            element.addEventListener('input', () => {
                this.onTextEdit(element);    // synchronize our copies when text is editing
            })
        });
    }

    onTextEdit(element) {  
        const id = element.getAttribute('nodeid');
        this.virtualDom.body.querySelector(`[nodeid="${id}"]`).innerHTML = element.innerHTML;
    }

    loadPageList() {
        axios
            .get('./api')
            .then(res => this.setState({pageList: res.data}))
    }

    createNewPage() {
        axios
            .post('./api/createNewPage.php', {"name": this.state.newPageName})
            .then(this.loadPageList())
            .catch(() => alert('This file alreardy exists'));
    }

    deletePage(page) {
        axios
            .post('./api/deletePage.php', {"name": page})
            .then(this.loadPageList())
            .catch(() => alert('This file wasn\'t found'));
    }

    render() {
        // const {pageList} = this.state;
        // const pages = pageList.map((page, i) => {
        //     return (
        //         <h1 key={i}>
        //             {page}
        //             <a 
        //                 href="#"
        //                 onClick={() => this.deletePage(page)}>(x)</a>
        //         </h1>
        //     )
        // });

        return(
            <>
                <button onClick={() => this.save()}>Click</button>
                <iframe src={this.currentPage} frameBorder="0"></iframe>
            </>

            // <>
            //     <input 
            //         onChange={(e) => {this.setState({newPageName: e.target.value})}} 
            //         type="text" />
            //     <button onClick={this.createNewPage}>Create new page</button>
            //     {pages}
            // </>
        )
    }
}