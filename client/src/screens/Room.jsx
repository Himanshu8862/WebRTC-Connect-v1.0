import React, { useEffect, useCallback, useState, useRef } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
    const socket = useSocket();
    const [remoteSocketId, setRemoteSocketId] = useState(null);
    const [myStream, setMyStream] = useState();
    const [remoteStream, setRemoteStream] = useState();
    const [msg, setMsg] = useState("");
    const [chats, setChats] = useState([]);
    const scrollRef = useRef();
    const [remoteEmail, setRemoteEmail] = useState(null);

    const [ismute, setIsmute] = useState(false)
    const [isRemoteMute, setIsRemoteMute] = useState(false);

    const [isVideo, setIsVideo] = useState(true)
    const [isRemoteVideo, setIsRemoteVideo] = useState(true);

    const handleUserJoined = useCallback(({ email, id }) => {
        console.log(`Email ${email} joined room`);
        setRemoteEmail(email);
        setRemoteSocketId(id);
    }, []);

    const handleCallUser = useCallback(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        const offer = await peer.getOffer();
        socket.emit("user:call", { to: remoteSocketId, offer });
        setMyStream(stream);
    }, [remoteSocketId, socket]);

    const handleIncommingCall = useCallback(
        async ({ from, offer, email }) => {
            setRemoteSocketId(from);
            setRemoteEmail(email);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
            });
            setMyStream(stream);
            console.log(`Incoming Call`, from, offer);
            const ans = await peer.getAnswer(offer);
            socket.emit("call:accepted", { to: from, ans });
        },
        [socket]
    );

    const sendStreams = useCallback(() => {
        for (const track of myStream.getTracks()) {
            peer.peer.addTrack(track, myStream);
        }
    }, [myStream]);

    const handleCallAccepted = useCallback(
        ({ from, ans }) => {
            peer.setLocalDescription(ans);
            console.log("Call Accepted!");
            sendStreams();
        },
        [sendStreams]
    );

    const handleNegoNeeded = useCallback(async () => {
        const offer = await peer.getOffer();
        socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
    }, [remoteSocketId, socket]);

    useEffect(() => {
        peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
        return () => {
            peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
        };
    }, [handleNegoNeeded]);

    const handleNegoNeedIncomming = useCallback(
        async ({ from, offer }) => {
            const ans = await peer.getAnswer(offer);
            socket.emit("peer:nego:done", { to: from, ans });
        },
        [socket]
    );

    const handleNegoNeedFinal = useCallback(async ({ ans }) => {
        await peer.setLocalDescription(ans);
    }, []);

    const handleMute = () => {
        setIsmute(!ismute)
        socket.emit("user:mute", { to: remoteSocketId, ismute })
    }

    const handleVideo = () => {
        setIsVideo(!isVideo)
        socket.emit("user:video", { to: remoteSocketId, isVideo })
    }

    const handleUserMuteDone = useCallback(({ ismute }) => {
        console.log("isremote", isRemoteMute)
        setIsRemoteMute(!isRemoteMute)
    }, [isRemoteMute])

    const handleUserVideoDone = useCallback(({ isVideo }) => {
        console.log("isremoteVideo", isRemoteVideo)
        setIsRemoteVideo(!isRemoteVideo)
    }, [isRemoteVideo])

    const handleSendMsg = (e) => {
        e.preventDefault();
        const curmsg = {
            "isRemoteMsg": false,
            "msg": msg,
        }
        const prevchats = [...chats];
        socket.emit("user:msgsend", { to: remoteSocketId, msg })
        prevchats.push(curmsg);
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

    useEffect(() => {
        peer.peer.addEventListener("track", async (ev) => {
            const remoteStream = ev.streams;
            console.log("GOT TRACKS!!");
            setRemoteStream(remoteStream[0]);
        });
    }, []);

    useEffect(() => {
        socket.on("user:joined", handleUserJoined);
        socket.on("incomming:call", handleIncommingCall);
        socket.on("call:accepted", handleCallAccepted);
        socket.on("peer:nego:needed", handleNegoNeedIncomming);
        socket.on("peer:nego:final", handleNegoNeedFinal);
        socket.on("user:mute:done", handleUserMuteDone)
        socket.on("user:video:done", handleUserVideoDone)
        socket.on("user:msgsend:done", handleIncommingMsg);


        return () => {
            socket.off("user:joined", handleUserJoined);
            socket.off("incomming:call", handleIncommingCall);
            socket.off("call:accepted", handleCallAccepted);
            socket.off("peer:nego:needed", handleNegoNeedIncomming);
            socket.off("peer:nego:final", handleNegoNeedFinal);
            socket.off("user:mute:done", handleUserMuteDone)
            socket.off("user:video:done", handleUserVideoDone)
            socket.off("user:msgsend:done", handleIncommingMsg);
        };
    }, [
        socket,
        handleUserJoined,
        handleIncommingCall,
        handleCallAccepted,
        handleNegoNeedIncomming,
        handleNegoNeedFinal,
        handleUserMuteDone,
        handleUserVideoDone,
        handleIncommingMsg
    ]);

    return (
        <>
            <div>
                <h1>Room Page</h1>
                <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
                {myStream && <button onClick={sendStreams}>Send Stream</button>}
                {!remoteStream && remoteSocketId && <button onClick={handleCallUser}>CALL</button>}

                {remoteStream && <button onClick={handleVideo}>{isVideo ? "Hide video" : "Show video"}</button>}
                {remoteStream && <button onClick={handleMute}>{ismute ? "Unmute" : "Mute"}</button>}

                {myStream && (
                    <>
                        <h1>My Stream</h1>
                        {isVideo ? <ReactPlayer
                            playing={isVideo}
                            muted
                            height="300px"
                            width="500px"
                            url={myStream}
                        /> : <h3>Your video is off</h3>}
                    </>
                )}
                {remoteStream && (
                    <>
                        <h1>Remote Stream</h1>
                        {isRemoteVideo ? <ReactPlayer
                            playing={isRemoteVideo}
                            muted={isRemoteMute}
                            height="300px"
                            width="500px"
                            url={remoteStream}
                        /> : <h3>Peer's video is off</h3>}
                    </>
                )}
            </div>
            {remoteStream && (
                <>
                    <h1>Chats</h1>

                    <div >
                        {
                            chats.map((text) => {
                                return (
                                    <div ref={scrollRef}>
                                        {text.isRemoteMsg ?
                                            <p>{remoteEmail + ": " + text.msg}</p>
                                            :
                                            <p>{"You: " + text.msg}</p>
                                        }
                                    </div>
                                )
                            })
                        }
                    </div>
                    <div >
                        <form onSubmit={(e) => { handleSendMsg(e) }}>
                            <input
                                type="text"
                                placeholder="type your message here"
                                value={msg}
                                onChange={(e) => setMsg(e.target.value)}
                            />
                            <button type="submit">Send</button>
                        </form>
                    </div>
                </>
            )}
        </>
    );
};

export default RoomPage;
