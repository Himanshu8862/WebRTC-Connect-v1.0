import React, { useState, useCallback, useEffect } from 'react'
import { useSocket } from "../context/SocketProvider";
import { v4 as uuidv4 } from "uuid";
import "../css/Chatbox.css"

const Chatbox = ({ remoteEmail, remoteSocketId }) => {
    const socket = useSocket();
    const [msg, setMsg] = useState("");
    const [chats, setChats] = useState([]);
    const [isEnd, setIsEnd] = useState(false)

    const handleSendMsg = (e) => {
        e.preventDefault();
        const curmsg = {
            "isRemoteMsg": false,
            "msg": msg,
        }
        const prevchats = [...chats];
        socket.emit("user:msgsend", { to: remoteSocketId, msg })
        prevchats.push(curmsg);
        setMsg("")
        setChats(prevchats);
    }

    const handleIncommingMsg = useCallback(
        ({ msg }) => {
            const curmsg = {
                "isRemoteMsg": true,
                "msg": msg,
            }
            const prevchats = [...chats];
            prevchats.push(curmsg);
            setChats(prevchats);
        },
        [chats],
    )

    const handleEndCallIncomming = useCallback(
        () => {
            setIsEnd(true)
        },
        [],
    )

    useEffect(() => {
        socket.on("user:msgsend:done", handleIncommingMsg);
        socket.on("user:endcall", handleEndCallIncomming)

        return () => {
            socket.off("user:msgsend:done", handleIncommingMsg);
            socket.off("user:endcall", handleEndCallIncomming)
        }
    }, [socket, handleIncommingMsg, handleEndCallIncomming])

    return (
        <>
            <h1>Chat</h1>

            <div className="container-fluid w-100 msg-group center">
                {
                    chats.map((text) => {
                        return (
                            <div className="" key={uuidv4()}>
                                <div className="card">
                                    <div className="card-body">
                                        <h6
                                            className={`card-subtitle mb-2 text-muted ${text.isRemoteMsg ? "text-left" : "text-right"}`}
                                        >
                                            {text.isRemoteMsg ? remoteEmail : "You"}
                                        </h6>
                                        <p
                                            style={{ overflowWrap: "break-word", wordWrap: "break-word", wordBreak: "break-word" }}
                                            className={`text-wrap card-text ${text.isRemoteMsg ? "float-left" : "float-right"}`}
                                        >{text.msg}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                }
                {isEnd &&
                    <div className="card">
                        <div className="card-body">
                            <h6
                                className={`card-subtitle mb-2 text-muted`}
                            >
                                {`${remoteEmail} \nLEFT THE CHAT`}
                            </h6>
                        </div>
                    </div>
                }

            </div >
            <div className="container-fluid w-100 mt-3 mb-3 btn-input">
                <form onSubmit={(e) => { handleSendMsg(e) }}>
                    <div className="row">
                        <textarea
                            type="text"
                            className="form-control col-sm-10"
                            rows="1"
                            required
                            placeholder="Type your message here"
                            value={msg}
                            onChange={(e) => setMsg(e.target.value)}
                        />
                        <button className="btn btn-secondary mt-2 float-right col-sm-2" type="submit" >Send</button>
                    </div>
                </form>
            </div>
        </>
    )
}

export default Chatbox