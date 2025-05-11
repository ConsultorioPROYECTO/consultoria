import Image from "next/image";
import { APP_NAME } from "./constants/constants";

export default function Home() {
  return (
    // Remove justify-center and items-center to align content to top-left
    // Adjust padding as needed (e.g., p-8 sm:p-16 md:p-24)
    <div className="bg-white dark:bg-gray-800">
      <div className="min-h-screen px-16 overflow-y-auto flex flex-col gap-y-32">
        {/* Seccion 1  */}
        <div className="grid grid-cols-12 gap-y-4 gap-x-4 p-90 overflow-y-auto">
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          <div>1</div>
          

        </div>

        {/* Seccion 2 */}
        <div className="bg-black/90 p-90"> </div>
        </div>
      </div>
  );
}
