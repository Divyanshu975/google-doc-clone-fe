import React, { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { useParams } from "react-router-dom";
import socket from "../socket";

const SAVE_INTERVAL_MS = 2000;

const Editor = () => {
  const { id: docId } = useParams();
  const [quill, setQuill] = useState();

  useEffect(() => { //this is to load the existing content of the file
    if (!socket || !quill) return;

    socket.once("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
    });

    socket.emit("join-document", docId);
    console.log("emitted join document")

    socket.emit("get-document", docId);
  }, [socket, quill, docId]);

  useEffect(() => {  //this is to emit changes to the socket whenever we edit the quill editor
    if (!socket || !quill) return;

    const handler = (delta, oldDelta, source) => {
      console.log('changes', delta, oldDelta, source);
      if (source !== "user") return;
      socket.emit("send-changes", delta);
      console.log("send-changes called with",delta)
    };

    quill.on("text-change", handler);
    return () => quill.off("text-change", handler);
  }, [socket, quill]);

  useEffect(() => { //this is for whenever some other user edits the doc and to reflect the changes in my doc
    if (!socket || !quill) return;

    const handler = (delta) => {
      quill.updateContents(delta);
    };

    socket.on("receive-changes", handler);
    return () => socket.off("receive-changes", handler);
  }, [socket, quill]);

  useEffect(() => {  // this is to save the updated document
    if (!socket || !quill) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [socket, quill]);

  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;
    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    setQuill(new Quill(editor, { theme: "snow" }));
  }, []);

  return <div className="container" ref={wrapperRef} style={{width: "800px", height: "500px"}}></div>;
};

export default Editor;
