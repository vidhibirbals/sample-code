import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '@/components/layout';
import styles from '@/styles/Home.module.css';
import { Message } from '@/types/chat';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import LoadingDots from '@/components/ui/LoadingDots';
import { Document } from 'langchain/document';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TypeAnimation } from 'react-type-animation';
import Link from 'next/link';

export default function Home() {
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [sourceDocs, setSourceDocs] = useState<Document[]>([]);
  const [allfiles, setallFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTempFiles, SetSelectedTempFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [messageState, setMessageState] = useState<{
    messages: Message[];
    pending?: string;
    history: [string, string][];
    pendingSourceDocs?: Document[];
  }>({
    messages: [
      {
        message: 'Hi, what would you like to learn about this doc?',
        type: 'apiMessage',
      },
    ],
    history: [],
    pendingSourceDocs: [],
  });

  const { messages, pending, history, pendingSourceDocs } = messageState;

  const messageListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [selectedDataset, setSelectedDataset] = useState('');

  const handleDatasetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSelectedDataset(value);
  };
  
  useEffect(() => {
    textAreaRef.current?.focus();
  }, []);

  //handle form submission
  async function handleSubmit(e: any) {
    e.preventDefault();

    setError(null);

    if (!query) {
      alert('Please input a question');
      return;
    }

    const question = query.trim();

    setMessageState((state) => ({
      ...state,
      messages: [
        ...state.messages,
        {
          type: 'userMessage',
          message: question,
        },
      ],
      pending: undefined,
    }));

    setLoading(true);
    setQuery('');
    setMessageState((state) => ({ ...state, pending: '' }));

    const ctrl = new AbortController();

    try {
      fetchEventSource('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history,
          selectedTempFiles,
        }),
        signal: ctrl.signal,
        onmessage: (event) => {
          if (event.data === '[DONE]') {
            setMessageState((state) => ({
              history: [...state.history, [question, state.pending ?? '']],
              messages: [
                ...state.messages,
                {
                  type: 'apiMessage',
                  message: state.pending ?? '',
                  sourceDocs: state.pendingSourceDocs,
                },
                
              ],
              pending: undefined,
              pendingSourceDocs: undefined,
            }));
            setLoading(false);
            ctrl.abort();
          } else {
            const data = JSON.parse(event.data);
            if (data.sourceDocs) {
              setMessageState((state) => ({
                ...state,
                pendingSourceDocs: data.sourceDocs,
              }));
            } else {
              setMessageState((state) => ({
                ...state,
                pending: (state.pending ?? '') + data.data,
              }));
            }
          }
        },
        
      });
    } catch (error) {
      setLoading(false);
      setError('An error occurred while fetching the data. Please try again.');
    }
  }

  //prevent empty submissions
  const handleEnter = useCallback(
    (e: any) => {
      if (e.key === 'Enter' && query) {
        handleSubmit(e);
      } else if (e.key == 'Enter') {
        e.preventDefault();
      }
    },
    [query],
  );

  const chatMessages = useMemo(() => {
    return [
      ...messages,
      ...(pending
        ? [
            {
              type: 'apiMessage',
              message: pending,
              sourceDocs: pendingSourceDocs,
            },
          ]
        : []),
    ];
  }, [messages, pending, pendingSourceDocs]);

  //scroll to bottom of chat
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [chatMessages]);


  const getFiles = async () => {
    try {
      const response = await fetch("/api/upload");
      const data = await response.json();
      setallFiles(data.files);
    } catch (error: any) {
      console.log(error.response?.data);
    }
  };

  const deleteFile = async (fileName: any) => {
    try {
      const response = await fetch(`/api/upload?fileName=${fileName}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok) {
        getFiles()
      } else {
        setErrorMessage(data.error);
      }
    } catch (error: any) {
      console.log(error.response?.data);
    }
  }

  useEffect(() => {
    getFiles()
  }, []);

  const handleCheckboxChange = (file: File) => {
    if (selectedTempFiles.includes(file)) {
      SetSelectedTempFiles(selectedTempFiles.filter((item) => item !== file));
    } else {
      SetSelectedTempFiles([...selectedTempFiles, file]);
    }
  };

  const[nav , setNav] = useState(false)
  const handleNav = () => {
    setNav(!nav);
  };

  return (
    <> 
    <div className='flex flex-row'>
        {/* Mobile Nav */}

      {/* slider*/}
      <div className={nav? 'h-full fixed z-20 w-[85%] bg-[#134055] px-4 py-5  flex flex-col justify-between space-y-5 items-center' : 'hidden absolute left-[-100%]'}>
        <button onClick={handleNav} className='absolute top-0 right-0 bg-[#04acfc] p-2 w-8 h-8 flex items-center justify-center'>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className='fill-black'><path d="m16.192 6.344-4.243 4.242-4.242-4.242-1.414 1.414L10.535 12l-4.242 4.242 1.414 1.414 4.242-4.242 4.243 4.242 1.414-1.414L13.364 12l4.242-4.242z"></path></svg>
        </button>
          <>
          <div className='w-full'>
          <h1 className="text-center text-[#8adbf5] font-medium mb-3 mt-6">Filter from Uploaded Documents</h1>
            {/* <h1 className=" text-center text-black font-bold my-3">Filter from Uploaded Documents</h1> */}
            <ul className="text-white px-4 overflow-y-auto h-[500px] custom-scrollbar">
        {allfiles.map((file) => (
          <li className="space-x-6 flex items-center my-1 justify-between border-b-2 border-gray-300 py-1" key={file}>
            <div className="font-semibold md:text-[13px]">
          {file}{" "}
          </div>
          <input
            type="checkbox"
            checked={selectedTempFiles.includes(file)}
            onChange={() => handleCheckboxChange(file)}
            className="ml-2 w-5 h-5"
          />         
          </li>
        ))}
      </ul>
            </div>

            <div className="flex flex-row w-full justify-center mt-5">
                <button onClick={handleNav} className="rounded-md mx-4 bg-[#04acfc] text-white px-4 py-2 mb-2 hover:bg-blue-500">Done</button>
            </div>
        </>
            
      </div>

      {/* end mobile nav */}
    <div className="hidden md:flex h-screen w-[400px] bg-[#134055] px-4 py-10 md:flex-col justify-between space-y-5">
                

            <div>
            <div className="rounded-md mx-4 text-white py-2 mb-2 text-center text-2xl font-semibold">
              <h1 className=''>Welcome to InstaAI</h1>
            <TypeAnimation
      sequence={[
        // Same substring at the start will only be typed out once, initially
        'Mortgage Solutions',
        1000,
        'Powered by AI',
        1000,
      ]}
      wrapper="span"
      speed={60}
      style={{ fontSize: '20px', display: 'inline-block' }}
      repeat={Infinity}
    />
            </div>
            <h1 className="text-center text-[#8adbf5] font-medium mb-3 mt-6">Filter from Uploaded Documents</h1>
            <ul className="text-[#eaf1f6] px-4 overflow-y-auto h-[485px] custom-scrollbar">
        {allfiles.length > 0 && allfiles.map((file) => (
          <li className="space-x-6 flex items-center my-1 justify-between border-b-2 border-gray-300 py-1" key={file}>
            <div className="font-semibold md:text-[13px]">
          {file}{" "}
            </div>
            <input
            type="checkbox"
            checked={selectedTempFiles.includes(file)}
            onChange={() => handleCheckboxChange(file)}
            className="mr-2"
          />
          </li>
        ))}
      </ul>
            </div>

            {/* <div className="flex flex-row justify-center mt-5">
                <Link href="/ingest">
                <div className="rounded-md mx-4 bg-blue-400 text-white px-4 py-2 mb-2 hover:bg-blue-500">Ingest more documents</div>
                </Link>
            </div> */}
        </div>
      <Layout>
        <div className="mx-auto flex flex-col gap-4">
          <div className='w-full flex flex-row justify-between py-4 px-8 items-center'>
          <a href='https://instamortgage.com/' target='_blank'>
            <img src='/insta_mortage_logo.png' className='md:w-[130px] w-[100px]'/>
          </a>
          <h1 className="hidden md:flex text-2xl font-bold leading-[1.1] tracking-wide text-center">
          Guidelines AI
          </h1>
          <button onClick={handleNav} className='bg-[#134055] p-2 flex items-center justify-center md:hidden rounded-lg'>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className='fill-white'><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"></path></svg>
        </button>
          </div>
          <main className={styles.main}>
            <div className={styles.cloud}>
              <div ref={messageListRef} className={styles.messagelist}>
                {chatMessages.map((message, index) => {
                  let icon;
                  let className;
                  if (message.type === 'apiMessage') {
                    icon = (
                      <Image
                        src="/bot-image.png"
                        alt="AI"
                        width="40"
                        height="40"
                        className={styles.boticon}
                        priority
                      />
                    );
                    className = styles.apimessage;
                  } else {
                    icon = (
                      <Image
                        src="/usericon.png"
                        alt="Me"
                        width="40"
                        height="40"
                        className={styles.usericon}
                        priority
                      />
                    );
                    // The latest message sent by the user will be animated while waiting for a response
                    className =
                      loading && index === chatMessages.length - 1
                        ? styles.usermessagewaiting
                        : styles.usermessage;
                  }
                  return (
                    <>
                      <div key={`chatMessage-${index}`} className={className}>
                        {icon}
                        <div className={styles.markdownanswer}>
                          <div dangerouslySetInnerHTML={{
                __html: message.message.replaceAll("\n", "<br/>"),
              }} />
                        </div>
                      </div>
                    {message.sourceDocs && message.sourceDocs.length > 0 && (
  <div className="p-5">
    <Accordion type="single" collapsible className="flex-col">
      <div>
        <AccordionItem value="item-0">
          <AccordionTrigger>
            <h3>Source</h3>
          </AccordionTrigger>
          <AccordionContent>
            {/* <ReactMarkdown linkTarget="_blank">
              {message.sourceDocs[0].pageContent}
            </ReactMarkdown> */}
            <p className="mt-2">
              <b>Source:</b> {message.sourceDocs[0].metadata.pdf_name}
            </p>
          </AccordionContent>
        </AccordionItem>
      </div>
    </Accordion>
  </div>
)}
                    </>
                  );
                })}
              </div>
            </div>
            <div className={styles.center}>
              <div className={styles.cloudform}>
                <form onSubmit={handleSubmit}>
                  <textarea
                    disabled={loading}
                    onKeyDown={handleEnter}
                    ref={textAreaRef}
                    autoFocus={false}
                    rows={1}
                    maxLength={512}
                    id="userInput"
                    name="userInput"
                    placeholder={
                      loading
                        ? 'Waiting for response...'
                        : 'What is this doc about?'
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className={styles.textarea}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={styles.generatebutton}
                  >
                    {loading ? (
                      <div className={styles.loadingwheel}>
                        <LoadingDots color="#000" />
                      </div>
                    ) : (
                      // Send icon SVG in input field
                      <svg
                        viewBox="0 0 20 20"
                        className={styles.svgicon}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </div>
            {error && (
              <div className="border border-red-400 rounded-md p-4">
                <p className="text-red-500">{error}</p>
              </div>
            )}
          </main>
        </div>
      </Layout>
      </div>
    </>
  );
}
