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

    const [isScreen, setIsScreen] = useState(false)

    const [videoTracks, setVideoTracks] = useState()

    const [myScreen, setMyScreen] = useState();

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
        setVideoTracks(stream.getVideoTracks()[0]);
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
            setVideoTracks(stream.getVideoTracks()[0]);
            setMyStream(stream);
            console.log(`Incoming Call`, from, offer);
            const ans = await peer.getAnswer(offer);
            socket.emit("call:accepted", { to: from, ans });
        },
        [socket]
    );

    const sendStreams = useCallback(() => {
        // for (const track of myStream.getTracks()) {
        //     peer.peer.addTrack(track, myStream);
        // }
        console.log(videoTracks)
        console.log(myStream)
        console.log(myScreen)
        console.log("1",myStream)
        peer.peer.addStream(myStream)
        // peer.peer.removeStream(myStream)
        // console.log("2",myStream)
        // myStream.removeTrack(videoTracks)
        // console.log("3",myStream)
        // myStream.addTrack(videoTracks)
        // console.log("4",myStream)
        // peer.peer.addStream(myStream)
        // console.log("5",myStream)
        setCutcall(true);
    }, [myStream, videoTracks, myScreen]);

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
        if(!isVideo)
        {
            myStream.addTrack(videoTracks)
            if(!isScreen)
            {
                peer.peer.removeStream(myStream)
                peer.peer.addStream(myStream)
            }
        }
        else
        {
            myStream.removeTrack(videoTracks)
            if(!isScreen)
            {
                peer.peer.removeStream(myStream)
                peer.peer.addStream(myStream)
            }
        }
        setIsVideo(!isVideo)
        // socket.emit("user:video", { to: remoteSocketId, isVideo })
    }

    const handleUserMuteDone = useCallback(({ ismute }) => {
        console.log("isremote", isRemoteMute)
        setIsRemoteMute(!isRemoteMute)
    }, [isRemoteMute])

    const handleUserVideoDone = useCallback(({ isVideo }) => {
        console.log("isremoteVideo", isRemoteVideo)
        setIsRemoteVideo(!isRemoteVideo)
    }, [isRemoteVideo])

    const handleCallEnd = () => {
        socket.emit("user:endcall",{to: remoteSocketId})
        peer.peer.removeStream(myStream);
        if(myScreen)
        {
            peer.peer.removeStream(myScreen);
        }
        navigate("/");
    }

    const handleShareScreen = useCallback(
           async () => {
            if(!isScreen)
            {
                const screen =  await navigator.mediaDevices.getDisplayMedia({
                    audio: true,
                    video: true,
                });
                console.log(screen)
                setMyScreen(screen);
                console.log(myScreen);
                peer.peer.removeStream(myStream)
                peer.peer.addStream(screen)
            }
            else
            {
                peer.peer.removeStream(myScreen)
                peer.peer.addStream(myStream)
            }
            setIsScreen(!isScreen)
        },
        [isScreen, myScreen, myStream],
    )

    useEffect(() => {
        peer.peer.addEventListener("track", async (ev) => {
            const remoteStream1 = ev.streams;
            console.log("GOT TRACKS!!",remoteStream1);
            setRemoteStream(null);
            setTimeout(() => {
                setRemoteStream(remoteStream1[0]);
              }, 10);
        });
    }, [remoteStream]);

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
                                    {!isScreen && myStream && (
                                        <>
                                            {/* {isVideo ? <ReactPlayer
                                                playing={isVideo}
                                                muted
                                                // height="300px"
                                                width="100%"
                                                url={myStream}
                                            /> : <h3>Your video is off</h3>} */}
                                             {<ReactPlayer
                                                playing
                                                muted
                                                // height="300px"
                                                width="100%"
                                                url={myStream}
                                            />}
                                        </>
                                    )}
                                    {isScreen && myStream && (
                                        <>
                                             {<ReactPlayer
                                                playing
                                                muted
                                                // height="300px"
                                                width="100%"
                                                url={myScreen}
                                            />}
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
                                            {/* {isRemoteVideo ? <ReactPlayer
                                                playing={isRemoteVideo}
                                                muted={isRemoteMute}
                                                // height="300px"
                                                width="100%"
                                                url={remoteStream}
                                            /> : <h3>Peer's video is off</h3>} */}
                                            {<ReactPlayer
                                                playing
                                                muted={isRemoteMute}
                                                // height="300px"
                                                width="100%"
                                                url={remoteStream}
                                            />}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {cutcall && myStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleCallEnd}>Hang up</button>}

                {!cutcall && myStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={sendStreams}>Answer</button>}

                {!remoteStream && remoteSocketId && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleCallUser}>CALL</button>}

                {remoteStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleVideo}>{isVideo ? "Hide video" : "Show video"}</button>}

                {remoteStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleMute}>{ismute ? "Unmute" : "Mute"}</button>}

                {remoteStream && <button style={{height:"50px"}} className="btn btn-secondary mr-1" onClick={handleShareScreen}>{isScreen ? "Hide Screen" : "Share Screen"}</button>}




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
