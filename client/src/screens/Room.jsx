import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";
import Chatbox from "./Chatbox";
import { useNavigate } from "react-router-dom";

const RoomPage = () => {
    const navigate = useNavigate()
    const socket = useSocket();
    const [remoteSocketId, setRemoteSocketId] = useState(null);
    const [myStream, setMyStream] = useState();
    const [remoteStream, setRemoteStream] = useState();
    const [remoteEmail, setRemoteEmail] = useState(null);

    const [cutcall, setCutcall] = useState(false)

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
        setCutcall(true);
    }, [myStream]);

    const handleCallAccepted = useCallback(
        ({ from, ans }) => {
            peer.setLocalDescription(ans);
            console.log("Call Accepted!");
            setCutcall(true)
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


        return () => {
            socket.off("user:joined", handleUserJoined);
            socket.off("incomming:call", handleIncommingCall);
            socket.off("call:accepted", handleCallAccepted);
            socket.off("peer:nego:needed", handleNegoNeedIncomming);
            socket.off("peer:nego:final", handleNegoNeedFinal);
            socket.off("user:mute:done", handleUserMuteDone)
            socket.off("user:video:done", handleUserVideoDone)
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
    ]);

    return (
        <>
        <div className="row">
            <div className="col-sm-8">
                <h1>Room Page</h1>
                <h4>{remoteSocketId ? "🟢Connected" : "🟡No one in room"}</h4>

                <div className="container mt-3 mb-3">
                    <div className="row">
                        <div className="col-sm-6">
                            <div className="card">
                                <div className="card-body">
                                    <h3 className="card-title">My Stream</h3>
                                    {myStream && (
                                        <>
                                            {isVideo ? <ReactPlayer
                                                playing={isVideo}
                                                muted
                                                // height="300px"
                                                width="100%"
                                                url={myStream}
                                            /> : <h3>Your video is off</h3>}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="card">
                                <div className="card-body">
                                    <h3 className="card-title">Remote Stream</h3>
                                    {remoteStream && (
                                        <>
                                            {isRemoteVideo ? <ReactPlayer
                                                playing={isRemoteVideo}
                                                muted={isRemoteMute}
                                                // height="300px"
                                                width="100%"
                                                url={remoteStream}
                                            /> : <h3>Peer's video is off</h3>}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {cutcall && myStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={()=>{navigate("/")}}>Hang up</button>}

                {!cutcall && myStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={sendStreams}>Answer</button>}

                {!remoteStream && remoteSocketId && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleCallUser}>CALL</button>}

                {remoteStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleVideo}>{isVideo ? "Hide video" : "Show video"}</button>}

                {remoteStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleMute}>{ismute ? "Unmute" : "Mute"}</button>}




            </div>

            <div className="col-sm-4">
            {remoteStream &&
                <Chatbox remoteEmail={remoteEmail} remoteSocketId={remoteSocketId} />
            }
            </div>
            </div>
        </>
    );
};

export default RoomPage;
